import { createScorer } from '@mastra/core/evals';
import stringSimilarity from 'string-similarity';
import { getTextContentFromMastraDBMessage } from '../../utils';

interface ContentSimilarityOptions {
  ignoreCase?: boolean;
  ignoreWhitespace?: boolean;
}

export function createContentSimilarityScorer(
  { ignoreCase, ignoreWhitespace = true }: ContentSimilarityOptions = { ignoreCase: true },
) {
  return createScorer({
    id: 'content-similarity-scorer',
    name: 'Content Similarity Scorer',
    description: 'Calculates content similarity between input and output messages using string comparison algorithms.',
    type: 'agent',
  })
    .preprocess(async ({ run }) => {
      let processedInput = run.input?.inputMessages.map(i => getTextContentFromMastraDBMessage(i)).join(', ') || '';
      let processedOutput = run.output.map(i => getTextContentFromMastraDBMessage(i)).join(', ') || '';

      if (ignoreCase) {
        processedInput = processedInput.toLowerCase();
        processedOutput = processedOutput.toLowerCase();
      }

      if (ignoreWhitespace) {
        processedInput = processedInput.replace(/\s+/g, ' ').trim();
        processedOutput = processedOutput.replace(/\s+/g, ' ').trim();
      }

      return {
        processedInput,
        processedOutput,
      };
    })
    .generateScore(({ results }) => {
      const input = results.preprocessStepResult?.processedInput;
      const output = results.preprocessStepResult?.processedOutput;
      // compareTwoStrings strips all whitespace before comparing, so when
      // whitespace should count, run the same Dice bigram comparison without
      // the strip. Re-encoding whitespace as another character does not work:
      // any real character can appear in the input and collide.
      const similarity = ignoreWhitespace
        ? stringSimilarity.compareTwoStrings(input, output)
        : comparePreservingWhitespace(input, output);

      return similarity;
    });
}

// Dice coefficient over bigrams, identical to string-similarity's
// compareTwoStrings except whitespace is not stripped first.
function comparePreservingWhitespace(first?: string, second?: string): number {
  const a = first ?? '';
  const b = second ?? '';

  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const firstBigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    firstBigrams.set(bigram, (firstBigrams.get(bigram) ?? 0) + 1);
  }

  let intersectionSize = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = firstBigrams.get(bigram) ?? 0;
    if (count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2.0 * intersectionSize) / (a.length + b.length - 2);
}
