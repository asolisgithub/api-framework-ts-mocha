import { AxiosRequestConfig } from "axios";
import { ServiceBase } from "../../base/ServiceBase.js";
import { Response } from "../responses/Response.js";
import { QueryModel } from "../request/QueryModel.js";

export class ChatbotService extends ServiceBase {
  sessionCookie: string | undefined;

  constructor() {
    super(`:${process.env["CHATBOT_API_PORT"]}/query`);
    this.sessionCookie = undefined;
  }

  async sendMessage<T>(query: QueryModel): Promise<Response<T>> {
    let sendMessageRequestConfig: AxiosRequestConfig = this.defaultConfig;

    if (this.sessionCookie) {
      sendMessageRequestConfig = { headers: { Cookie: this.sessionCookie } };
    }

    const queryResponse = await this.post(
      this.url,
      query,
      this.sessionCookie ? sendMessageRequestConfig : undefined,
    );

    if (!this.sessionCookie) {
      const setCookieHeader = queryResponse.headers["set-cookie"] as string[];
      this.sessionCookie = setCookieHeader[0]?.split(";")[0];
    }

    return queryResponse as Response<T>;
  }

  restartSession(): void {
    this.sessionCookie = undefined;
  }
}
