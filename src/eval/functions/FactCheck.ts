import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import {
  ClaimsListObject,
  processResponseWithRetries,
  ResultObject,
  ThoughtsAndResultObject,
  validateClaimsList,
  validateResultObject,
  validateThoughtsAndResultObject,
} from "./AnthropicUtils.js";
import { MessageParam } from "@anthropic-ai/sdk/resources";
import { readPromptFromFile } from "../../utils/helpers.js";

const anthropicClient = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

function buildClaimCheckContent(claim: string, document: string): MessageParam {
  return {
    role: "user",
    content: `Claim: ${claim}\nRelevant info: ${document}\n`,
  };
}

function buildClaimsContent(assistantOutput: string): MessageParam {
  return {
    role: "user",
    content: assistantOutput,
  };
}

interface ClaimResult {
  claim: string;
  result: boolean;
}

interface FactCheckResult {
  claims: ClaimResult[];
  claimCheckPassPercentage: number;
}

const claimExtractionPrompt = readPromptFromFile("claim_extraction_prompt.txt", "fact_check");
const claimCheckingPrompt = readPromptFromFile("claim_checking_prompt.txt", "fact_check");
const claimCheckingWithCotPrompt = readPromptFromFile(
  "claim_checking_with_cot_prompt.txt",
  "fact_check",
);

export async function processClaimCheck(
  userQueries: string[],
  assistantResponse: string,
  useCot: boolean,
): Promise<FactCheckResult> {
  const claimExtractionContent = buildClaimsContent(assistantResponse);
  type CheckClaimObject = ThoughtsAndResultObject | ResultObject;

  const extractedClaimsAsJson = await processResponseWithRetries<ClaimsListObject>(
    anthropicClient,
    claimExtractionPrompt,
    claimExtractionContent,
    validateClaimsList,
  );

  if (!extractedClaimsAsJson) {
    throw new Error("Failed to extract claims!");
  }

  const extractedClaimsList = extractedClaimsAsJson.claims;
  console.log("\nExtracted claims:\n");
  extractedClaimsList.forEach((claim: string) => console.log(`- ${claim}\n`));

  const trueLabeledClaims: string[] = [];
  const claimCheckResults: { claim: string; result: boolean }[] = [];
  const systemPrompt = useCot ? claimCheckingWithCotPrompt : claimCheckingPrompt;

  for (const query of userQueries) {
    const dbSemanticSearchResponse = await axios.post(process.env["CHATBOT_DB_API"] || "", {
      query: query,
    });
    const dbSemanticSearchDocuments = dbSemanticSearchResponse.data.documents;

    console.log("\nRetrieved documents:\n");

    dbSemanticSearchDocuments.forEach((doc: string) => console.log(`- ${doc.slice(0, 50)}...\n`));

    for (const document of dbSemanticSearchDocuments) {
      for (const claim of extractedClaimsList) {
        if (!trueLabeledClaims.includes(claim)) {
          const claimCheckContent = buildClaimCheckContent(claim, document);

          const checkClaimResultJson = await processResponseWithRetries<CheckClaimObject>(
            anthropicClient,
            systemPrompt,
            claimCheckContent,
            useCot ? validateThoughtsAndResultObject : validateResultObject,
          );

          if (checkClaimResultJson) {
            if (useCot && "thoughts" in checkClaimResultJson) {
              console.log(`Claim to verify: ${claim}\n`);
              console.log(`Document: ${document.slice(0, 50)}...\n`);
              console.log("Chain of thought:\n");
              checkClaimResultJson.thoughts.forEach((thought: string) =>
                console.log(`- ${thought}\n`),
              );
              console.log(`Conclusion: ${checkClaimResultJson.result}\n`);
            }

            if (checkClaimResultJson.result === true) {
              trueLabeledClaims.push(claim);
              claimCheckResults.push({ claim, result: true });
            }
          }
        }
      }
    }
  }

  const unverifiedClaims = extractedClaimsList.filter(
    (claim) => !trueLabeledClaims.includes(claim),
  );

  for (const claim of unverifiedClaims) {
    for (const query of userQueries) {
      const extendedQuery = `${query}, ${claim}`;

      const additionalDbResponse = await axios.post(process.env["CHATBOT_DB_API"] || "", {
        query: extendedQuery,
      });

      const additionalDocuments = additionalDbResponse.data.documents;
      console.log(`\nAdditional lookup for claim: ${claim}\n`);
      additionalDocuments.forEach((doc: string) => console.log(`- ${doc.slice(0, 50)}...\n`));

      for (const document of additionalDocuments) {
        const claimCheckContent = buildClaimCheckContent(claim, document);

        const additionalCheckResultJson = await processResponseWithRetries<CheckClaimObject>(
          anthropicClient,
          systemPrompt,
          claimCheckContent,
          useCot ? validateThoughtsAndResultObject : validateResultObject,
        );

        if (additionalCheckResultJson) {
          if (useCot && "thoughts" in additionalCheckResultJson) {
            console.log(`Claim to verify (additional check): ${claim}\n`);
            console.log(`Document: ${document.slice(0, 50)}...\n`);
            console.log("Chain of thought:\n");
            additionalCheckResultJson.thoughts.forEach((thought: string) =>
              console.log(`- ${thought}\n`),
            );
            console.log(`Conclusion: ${additionalCheckResultJson.result}\n`);
          }

          if (additionalCheckResultJson.result === true) {
            trueLabeledClaims.push(claim);
            claimCheckResults.push({ claim, result: true });
            break;
          }
        }
      }
    }
  }

  extractedClaimsList.forEach((claim: string) => {
    if (!trueLabeledClaims.includes(claim)) {
      console.log(`X ${claim}`);
      claimCheckResults.push({ claim, result: false });
    } else {
      console.log(`✓ ${claim}`);
    }
  });

  const claimCheckPercentage =
    extractedClaimsList.length > 0
      ? (trueLabeledClaims.length / extractedClaimsList.length) * 100
      : 0;

  return {
    claims: claimCheckResults,
    claimCheckPassPercentage: claimCheckPercentage,
  };
}
