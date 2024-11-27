import { Scorer } from "../../eval/Scorer.js";
import { QueryModel } from "../../models/request/QueryModel.js";
import { ChatbotService } from "../../models/services/ChatbotService.js";
import { ChatbotResponse } from "../../models/responses/ChatbotResponse.js";

describe("Single questions", () => {
  const chatbotService = new ChatbotService();
  let scorer: Scorer;

  before(async () => {
    scorer = await Scorer.create({
      referenceFilePath: "./references/queryCompletions.csv",
    });
  });

  beforeEach(async () => {
    chatbotService.restartSession();
  });

  it("Ask for smartphone options", async () => {
    const chatbotUserQuery: QueryModel = {
      query: "Que smartphones venden?",
    };

    const chatbotQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      chatbotUserQuery,
    );

    await scorer.compare(chatbotQueryResponse.data.response, chatbotUserQuery.query);
  });

  it("Ask for audio devices options", async () => {
    const chatbotUserQuery: QueryModel = {
      query: "Que parlantes tienen?",
    };

    const chatbotQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      chatbotUserQuery,
    );

    await scorer.compare(chatbotQueryResponse.data.response, chatbotUserQuery.query);
  });

  it("Ask about warranty policy", async () => {
    const chatbotUserQuery: QueryModel = {
      query: "Me gustaria saber de cuanto es la garantia en sus productos",
    };

    const chatbotQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      chatbotUserQuery,
    );

    await scorer.compare(chatbotQueryResponse.data.response, chatbotUserQuery.query);

    await scorer.factCheck([chatbotUserQuery.query], chatbotQueryResponse.data.response);
  });

  it("Ask about refund policy", async () => {
    const chatbotUserQuery: QueryModel = {
      query: "Se puede devolver el producto en caso de que venga roto?",
    };

    const chatbotQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      chatbotUserQuery,
    );

    await scorer.compare(chatbotQueryResponse.data.response, chatbotUserQuery.query);

    await scorer.factCheck([chatbotUserQuery.query], chatbotQueryResponse.data.response);
  });

  it("Ask about payment options", async () => {
    const chatbotUserQuery: QueryModel = {
      query: "Que tarjetas aceptan?",
    };

    const chatbotQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      chatbotUserQuery,
    );

    await scorer.compare(chatbotQueryResponse.data.response, chatbotUserQuery.query);

    await scorer.factCheck([chatbotUserQuery.query], chatbotQueryResponse.data.response);
  });

  it("Ask about discounts and promos", async () => {
    const chatbotUserQuery: QueryModel = {
      query: "Tienen algun descuento?",
    };

    const chatbotQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      chatbotUserQuery,
    );

    await scorer.compare(chatbotQueryResponse.data.response, chatbotUserQuery.query);

    await scorer.factCheck([chatbotUserQuery.query], chatbotQueryResponse.data.response);
  });

  it("Ask about shipment options", async () => {
    const chatbotUserQuery: QueryModel = {
      query: "hacen envios?",
    };

    const chatbotQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      chatbotUserQuery,
    );

    await scorer.compare(chatbotQueryResponse.data.response, chatbotUserQuery.query);

    await scorer.factCheck([chatbotUserQuery.query], chatbotQueryResponse.data.response);
  });

  it("Ask for additional support or assistance", async () => {
    const chatbotUserQuery: QueryModel = {
      query: "Tienen algun numero para llamar?",
    };

    const chatbotQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      chatbotUserQuery,
    );

    await scorer.compare(chatbotQueryResponse.data.response, chatbotUserQuery.query);

    await scorer.factCheck([chatbotUserQuery.query], chatbotQueryResponse.data.response);
  });
});
