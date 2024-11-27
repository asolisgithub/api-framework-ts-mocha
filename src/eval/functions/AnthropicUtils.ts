import Anthropic from "@anthropic-ai/sdk";
import { MessageParam, TextBlock } from "@anthropic-ai/sdk/resources";

export async function processResponseWithRetries<T>(
  client: Anthropic,
  systemPrompt: string,
  content: MessageParam,
  validator: (response: any) => boolean,
  maxRetries = 5,
): Promise<T> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await client.messages.create({
        model: process.env["ANTHROPIC_MODEL"] || "claude-3-5-sonnet-latest",
        max_tokens: parseInt(process.env["MAX_TOKEN_OUTPUT"] || "8192", 10),
        temperature: 0,
        system: systemPrompt,
        messages: [content],
      });

      const responseContent = response.content
        .find((contentBlock): contentBlock is TextBlock => contentBlock.type == "text")
        ?.text.replace(/\n/g, "");
      const parsedResponse = JSON.parse(responseContent as string);

      if (validator(parsedResponse)) {
        return parsedResponse;
      } else {
        console.error("Response does not match the expected format, retrying...");
      }
    } catch (error) {
      console.error("Error occurred, retrying...", error);
    }

    retries++;
  }

  throw new Error("Max retries reached. Unable to process the response.");
}

export interface ThoughtsAndResultObject {
  thoughts: string[];
  result: boolean;
}

export function validateThoughtsAndResultObject(parsedJson: ThoughtsAndResultObject): boolean {
  return (
    Array.isArray(parsedJson?.thoughts) &&
    parsedJson.thoughts.length > 0 &&
    typeof parsedJson.result === "boolean"
  );
}

export interface ResultObject {
  result: boolean;
}

export function validateResultObject(parsedJson: ResultObject): boolean {
  return typeof parsedJson?.result === "boolean" || parsedJson?.result === null;
}

export interface ClaimsListObject {
  claims: string[];
}

export function validateClaimsList(parsedJson: ClaimsListObject): boolean {
  return Array.isArray(parsedJson?.claims) && parsedJson.claims.length > 1;
}

export interface DatabaseQueryObject {
  db_query: string;
}

export function validateDbQueryObject(jsonData: DatabaseQueryObject): boolean {
  return typeof jsonData === "object" && jsonData !== null && "db_query" in jsonData;
}

export interface DatabaseQueryWithCOTObject {
  db_query: string;
  thoughts: string[];
}

export function validateDbQueryObjectWithCot(jsonData: DatabaseQueryWithCOTObject): boolean {
  return (
    typeof jsonData === "object" &&
    jsonData !== null &&
    "db_query" in jsonData &&
    "thoughts" in jsonData
  );
}
