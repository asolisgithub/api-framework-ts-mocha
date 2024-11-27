import fs from "fs";
import Papa from "papaparse";
import { ReferenceModel } from "../eval/ReferenceModel.js";
import path from "path";

export async function csvToObject<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, csvString) => {
      if (err) {
        return reject(`Error reading file: ${err.message}`);
      }

      Papa.parse<T>(csvString, {
        header: true,
        complete: (results) => {
          resolve(results.data as T[]);
        },
        error: (error) => {
          reject(`Error parsing CSV: ${error.message}`);
        },
      });
    });
  });
}

export function getReferenceAtIndex(referenceModel: ReferenceModel | undefined) {
  if (referenceModel !== undefined) {
    return referenceModel.assistant;
  } else {
    return undefined;
  }
}

export function readPromptFromFile(fileName: string, subdirName = ""): string {
  const rootDir = process.cwd();

  const promptDir = path.join(rootDir, "src", "eval", "prompts", subdirName, fileName);

  try {
    return fs.readFileSync(promptDir, "utf-8");
  } catch (err) {
    console.error("Error reading file:", err);
    throw new Error("Failed to read the prompt file");
  }
}
