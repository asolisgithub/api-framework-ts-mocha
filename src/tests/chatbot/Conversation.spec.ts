import { Scorer } from "../../eval/Scorer.js";
import { QueryModel } from "../../models/request/QueryModel.js";
import { ChatbotService } from "../../models/services/ChatbotService.js";
import { ChatbotResponse } from "../../models/responses/ChatbotResponse.js";

describe("Conversation", () => {
  const chatbotService = new ChatbotService();
  let scorer: Scorer;

  before(async () => {
    scorer = await Scorer.create({
      referenceFilePath: "./references/conversations.csv",
    });
  });

  beforeEach(async () => {
    chatbotService.restartSession();
  });

  it("Ask for availability, warranty and shipment", async () => {
    const greetingQuery: QueryModel = {
      query: "Buenos dias, como estas?",
    };

    const greetingQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(greetingQuery);

    await scorer.compare(greetingQueryResponse.data.response, greetingQuery.query);

    const smartphoneDetailsQuery: QueryModel = {
      query: "Tienen el Samsung s24?",
    };

    const smartphoneDetailsQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      smartphoneDetailsQuery,
    );

    await scorer.compare(
      smartphoneDetailsQueryResponse.data.response,
      smartphoneDetailsQuery.query,
    );

    await scorer.factCheck(
      [smartphoneDetailsQuery.query],
      smartphoneDetailsQueryResponse.data.response,
    );

    const warrantyDetailsQuery: QueryModel = {
      query: "Como es el tema de la garantia?",
    };

    const warrantyDetailsQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      warrantyDetailsQuery,
    );

    await scorer.compare(warrantyDetailsQueryResponse.data.response, warrantyDetailsQuery.query);

    await scorer.factCheck(
      [smartphoneDetailsQuery.query, warrantyDetailsQuery.query],
      warrantyDetailsQueryResponse.data.response,
    );

    const shipmentDetailsQuery: QueryModel = {
      query: "Hacen envios?",
    };

    const shipmentDetailsQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      shipmentDetailsQuery,
    );

    await scorer.compare(shipmentDetailsQueryResponse.data.response, shipmentDetailsQuery.query);

    await scorer.factCheck(
      [shipmentDetailsQuery.query],
      shipmentDetailsQueryResponse.data.response,
    );
  });

  it("Ask about color options for product", async () => {
    const smartphoneDetailsQuery: QueryModel = {
      query: "Tienen el iphone 15?",
    };

    const smartphoneDetailsQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      smartphoneDetailsQuery,
    );

    await scorer.compare(
      smartphoneDetailsQueryResponse.data.response,
      smartphoneDetailsQuery.query,
    );

    await scorer.factCheck(
      [smartphoneDetailsQuery.query],
      smartphoneDetailsQueryResponse.data.response,
    );

    const productDetailsQuery: QueryModel = {
      query: "En que colores lo tienen?",
    };

    const productDetailsQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      productDetailsQuery,
    );

    console.log(productDetailsQueryResponse.data.response);

    await scorer.eval(
      [
        "El asistente debe brindar informacion informacion que se encuentre en su base de conocimiento",
        "El asistente debe hablar de manera concisa y efectiva",
      ],
      productDetailsQueryResponse.data.response,
    );
    await scorer.factCheck(
      [smartphoneDetailsQuery.query, productDetailsQuery.query],
      productDetailsQueryResponse.data.response,
    );
  });
});
