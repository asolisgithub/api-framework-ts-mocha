import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import {
  processResponseWithRetries,
  ResultObject,
  ThoughtsAndResultObject,
  validateDbQueryObject,
  validateDbQueryObjectWithCot,
  validateResultObject,
  validateThoughtsAndResultObject,
} from "./AnthropicUtils.js";

import { DatabaseQueryObject, DatabaseQueryWithCOTObject } from "./AnthropicUtils";
import { readPromptFromFile } from "../../utils/helpers.js";

const anthropicClient = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

const checkCriteriaPrompt = readPromptFromFile("criteria_checking_prompt.txt", "eval");
const checkIfCriteriaNeedsAdditionalInfoPrompt = readPromptFromFile(
  "check_if_query_db_is_needed_prompt.txt",
  "eval",
);
const checkCriteriaWithAdditionalInfoPrompt = readPromptFromFile(
  "criteria_checking_with_additional_info_prompt.txt",
  "eval",
);
const checkCriteriaWithCotPrompt = readPromptFromFile(
  "criteria_checking_with_cot_prompt.txt",
  "eval",
);
const checkIfQueryDbIsNeededUsingCotPrompt = readPromptFromFile(
  "check_if_query_db_is_needed_using_cot_prompt.txt",
  "eval",
);
const checkCriteriaWithAdditionalInfoAndCotPrompt = readPromptFromFile(
  "criteria_checking_with_additional_info_and_cot_prompt.txt",
  "eval",
);

interface criteriaResult {
  criteria: string;
  result: boolean;
}

interface evalResult {
  criteria: criteriaResult[];
  evalPassPercentage: number;
}

export async function evalCriteria(
  criteriaArray: string[],
  assistantResponse: string,
  useCot: boolean,
  dbAccess: boolean,
): Promise<evalResult> {
  const criteriaCheckResults: { criteria: string; result: boolean }[] = [];
  const approvedCriteriaPhrases: string[] = [];
  type CheckCriteriaResult = ResultObject | ThoughtsAndResultObject;
  type DatabaseQueryResult = DatabaseQueryWithCOTObject | DatabaseQueryObject;

  const assistantText = assistantResponse.replace("\\n", "");

  const checkIfCriteriaNeedsAdditionalInfo = useCot
    ? checkIfQueryDbIsNeededUsingCotPrompt
    : checkIfCriteriaNeedsAdditionalInfoPrompt;
  const checkCriteria = useCot ? checkCriteriaWithCotPrompt : checkCriteriaPrompt;
  const checkCriteriaWithInfo = useCot
    ? checkCriteriaWithAdditionalInfoAndCotPrompt
    : checkCriteriaWithAdditionalInfoPrompt;

  console.log("\nCriteria to check for:\n");
  criteriaArray.forEach((criteria) => console.log(`- ${criteria}\n`));

  for (const criteria of criteriaArray) {
    if (dbAccess) {
      console.log(`Does (${criteria}) need additional info to verify?\n`);
    }

    if (!approvedCriteriaPhrases.includes(criteria)) {
      if (dbAccess) {
        const dbQueryCheck = await processResponseWithRetries<DatabaseQueryResult>(
          anthropicClient,
          checkIfCriteriaNeedsAdditionalInfo,

          {
            role: "user",
            content: `Criteria: ${criteria}\nText to check criteria against: ${assistantText}\n`,
          },
          useCot ? validateDbQueryObjectWithCot : validateDbQueryObject,
        );

        if ("thoughts" in dbQueryCheck) {
          for (const thought of dbQueryCheck.thoughts) {
            console.log("- ", thought);
          }
        }

        if (dbQueryCheck?.db_query) {
          console.log("Additional info needed! - Query:", dbQueryCheck.db_query);

          const dbQuery = dbQueryCheck.db_query;
          const dbResponse = await axios.post(process.env["CHATBOT_DB_API"] || "", {
            query: dbQuery,
          });

          const dbDocuments = dbResponse.data.documents;

          console.log("\nRetrieved documents:\n");
          dbDocuments.forEach((doc: string) => console.log(`- ${doc.slice(0, 50)}...\n`));

          for (const document of dbDocuments) {
            const result = await processResponseWithRetries<CheckCriteriaResult>(
              anthropicClient,
              checkCriteriaWithInfo,
              {
                role: "user",
                content: `Criteria: ${criteria}\nText to check criteria against: ${assistantText}\nRetrieved related document: ${document}\n`,
              },
              useCot ? validateThoughtsAndResultObject : validateResultObject,
            );

            if ("thoughts" in result) {
              for (const thought of result.thoughts) {
                console.log("- ", thought);
              }
            }

            if (result?.result) {
              console.log(`✓ ${criteria}`);
              approvedCriteriaPhrases.push(criteria);
              criteriaCheckResults.push({ criteria, result: true });
              break;
            } else {
              console.log(`! Unable to verify: ${criteria}\n`);
            }
          }
        } else {
          console.log("No additional info needed\n");
          const result = await processResponseWithRetries<CheckCriteriaResult>(
            anthropicClient,
            checkCriteria,
            {
              role: "user",
              content: `Criteria: ${criteria}\nText to check criteria against: ${assistantText}\n`,
            },
            validateResultObject,
          );

          if ("thoughts" in result) {
            for (const thought of result.thoughts) {
              console.log("- ", thought);
            }
          }

          if (result?.result) {
            console.log(`✓ ${criteria}`);
            approvedCriteriaPhrases.push(criteria);
            criteriaCheckResults.push({ criteria, result: true });
          } else {
            console.log(`X ${criteria}`);
          }
        }
      } else {
        const result = await processResponseWithRetries<CheckCriteriaResult>(
          anthropicClient,
          checkCriteria,
          {
            role: "user",
            content: `Criteria: ${criteria}\nText to check criteria against: ${assistantText}\n`,
          },
          validateResultObject,
        );

        if ("thoughts" in result) {
          for (const thought of result.thoughts) {
            console.log("- ", thought);
          }
        }

        if (result?.result) {
          console.log(`✓ ${criteria}`);
          approvedCriteriaPhrases.push(criteria);
          criteriaCheckResults.push({ criteria, result: true });
        } else {
          console.log(`X ${criteria}`);
        }
      }
    }
  }

  console.log("\nFinal Results:\n");
  for (const criteria of criteriaArray) {
    if (!approvedCriteriaPhrases.includes(criteria)) {
      criteriaCheckResults.push({ criteria, result: false });
      console.log(`X ${criteria}`);
    } else {
      console.log(`✓ ${criteria}`);
    }
  }

  const evalPassPercentage =
    criteriaArray.length > 0 ? (approvedCriteriaPhrases.length / criteriaArray.length) * 100 : 0;

  return { criteria: criteriaCheckResults, evalPassPercentage: evalPassPercentage };
}
