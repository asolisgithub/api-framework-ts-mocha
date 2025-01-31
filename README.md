# API Automation Framework (TS+Mocha)

TypeScript API automation framework that does its job in a simple but effective way. It is designed to work with HTTP APIs but can be adapted to work with other protocols.

Libraries used:

- Mocha - Test Runner
- Axios - HTTP client
- Chai - Assertions

This example uses the [Restful-booker](https://restful-booker.herokuapp.com/apidoc/index.html) API for demonstration purposes.

## Setup

Before you begin, make sure you have Node.js installed on your machine.

### Preparing your Environment

Before starting with the setup, ensure you have a local copy of the repository. Follow these steps to clone the repository and set up your environment:

1. Clone the repository to your local machine using the following command in your terminal:

   ```bash
   git clone https://github.com/damianpereira86/api-framework-ts-mocha.git

2. Navigate to the project directory on your terminal. This is where the `package.json` file is located.

    ```bash
    cd api-framework-ts-mocha
    ```

3. Install the necessary dependencies by running the following command in the root folder:

    ```bash
    npm install
    ```

### Setting up your local environment

The `.env` file is used to store environment variables that are important for running your tests. By default, this file is not tracked by Git to prevent sensitive data like usernames and passwords from being shared publicly.

- Start by copying the `example.env` file provided in the project directory:

    ```bash
    cp example.env .env
    ```

- Open the `.env` file in your preferred text editor and update the following properties with your local environment values:

    ```yaml
    BASEURL=api_base_url
    USER=username
    PASSWORD=password
    ```

    Make sure to replace `api_base_url`, `username`, and `password` with the actual values you wish to use for testing. The `BASEURL` should point to the base URL of the API you are testing. `USER` and `PASSWORD` are used for scenarios where authentication is required.

**Note:** The values provided in the `example.env` file correspond to the [Restful-booker](https://restful-booker.herokuapp.com/apidoc/index.html) API used for demonstration purposes in this framework, which is a test API. I did it to make it frictionless to run the example tests. 
However, it is crucial to **never** commit these values or your personal environment variables to version control in a real project, as it can expose sensitive information.
    
### VS Code Extensions

Three VS Code extensions are recommended for this project. 

- Eslint (dbaeumer.vscode-eslint): Linter
- Prettier (esbenp.prettier-vscode): Code formatter
- TODO Highlight (jgclark.vscode-todo-highlight): Bug management

They will be recommended to the user on the setup since they are set as recommendations on the extension.json file.

### Running the tests

```bash
# Runs all tests
npm test

# Runs tests by tag
npm run smoke
npm run regression
```

### Eslint

You can use eslint with the help of the VS Code extension and with the following script.

```bash
npm run lint
```

### Prettier

Prettier is configured to run with eslint and to format the code on each save. 
In case you want run it separately use the folowing scripts:

- Check for issues:
    
    ```bash
    npm run check
    ```
    
- Resolve issues:
    
    ```bash
    npm run prettify
    ```
    
## Getting started

The idea behind this framework is to encapsulate endpoints on Service Models, for maintainability and reusability. You can think of Service Models as an analogy of Page Object Models for UI Automation.

## Service Models

In this framework, Service Models are used to encapsulate the API endpoints you are testing. This abstraction allows for better maintainability and reusability of your test code. The concept here is somewhat similar to the Page Object Model used in UI Automation, where each service model represents a specific set of functionality provided by your API.

### Understanding `ServiceBase`

The `ServiceBase` class is the foundation of all Service Models. It provides common functionality needed for making API requests and processing responses. When you create a new Service Model, it should extend `ServiceBase` to inherit these capabilities. This approach ensures consistency and reduces boilerplate code in your service models.

Here's what `ServiceBase` offers:

- **API Client Management**: It initializes and holds an instance of the `ApiClient`, ensuring that all service models use the same API client setup.
- **Base URL Configuration**: It dynamically sets the base URL for API requests using the `BASEURL` from your `.env` file. This allows for flexibility across different environments (e.g., development, staging, production).
- **Authentication**: The `authenticate` method simplifies the process of authenticating with the API. Once called, it stores the authentication token in the request headers, so subsequent API calls are authenticated. Note that as explained below in the [Authentication](#authentication) section, this is specific to this API, and must be adapted to your use case.
- **HTTP Methods**: `ServiceBase` provides methods for common HTTP requests (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). These methods handle the request execution and timing, then format the response into a standardized `Response` object, making it easier to work with.

### Extending `ServiceBase`

When you create a Service Model, you extend `ServiceBase` and define methods specific to the service you're testing. For example, a `BookingService` might have methods like `getBooking` or `createBooking`. Each method uses the HTTP methods provided by `ServiceBase` to interact with the API.

Here's a simple example of a service model:

```tsx
import { ServiceBase } from './ServiceBase'; // Import the base class

export class BookingService extends ServiceBase {
  constructor() {
    super("/booking"); // Set the endpoint path
  }

  async getBooking<T>(id: number, config = this.defaultConfig): Promise<Response<T>> {
    return await this.get<T>(`${this.url}/${id}`, config); // Use the inherited GET method
  }
}
```

By extending ServiceBase, BookingService gains all the functionalities of making HTTP requests, handling authentication, and standardizing responses, allowing you to focus on the logic specific to the Booking service.

### Other Models

In addition to **Service Models**, you should declare **Request** and **Response** models as needed. For example, here is the BookingModel that will be used to deserialize the response from the endpoint above.

```tsx
export interface BookingModel {
  id?: number | undefined;
  firstname?: string | undefined;
  lastname?: string | undefined;
  totalprice?: number | undefined;
  depositpaid?: boolean | undefined;
  bookingdates?: {
    checkin?: string | undefined;
    checkout?: string | undefined;
  };
  additionalneeds?: string | undefined;
}
```

## Tests

Next, you can create a simple test like this. 

```tsx
describe("Get Booking", () => {
  const bookingService = new BookingService();

  it("@Smoke - Get Booking successfully - 200", async () => {
    const bookingId = 123456;
    const response = await bookingService.getBooking<BookingModel>(bookingId);
    response.status.should.equal(200, JSON.stringify(response.data));
  });
```

Note the BookingModel on the generic getBooking function. With that in place, you can easily assert against the response body properties.

```tsx
it("@Smoke - Get Booking successfully - 200", async () => {
    const booking = await bookingService.addBooking<BookingResponse>({
      firstname: "Damian",
      lastname: "Pereira",
      totalprice: 1000,
      depositpaid: true,
      bookingdates: {
        checkin: "2024-01-01",
        checkout: "2024-02-01",
      },
      additionalneeds: "Breakfast",
    });

    const bookingId = booking.data.bookingid;

    const response = await bookingService.getBooking<BookingModel>(bookingId);
    response.status.should.equal(200, JSON.stringify(response.data));
    response.data.firstname?.should.equal(booking.data.booking.firstname);
    response.data.lastname?.should.equal(booking.data.booking.lastname);
    response.data.totalprice?.should.equal(booking.data.booking.totalprice);
    response.data.depositpaid?.should.be.true;
    response.data.bookingdates?.checkin?.should.equal(booking.data.booking.bookingdates?.checkin);
    response.data.bookingdates?.checkout?.should.equal(booking.data.booking.bookingdates?.checkout);
    response.data.additionalneeds?.should.equal(booking.data.booking.additionalneeds);
  });
```

In the example above, I am using a call to the addBooking endpoint to create the booking needed for the getBooking test, and then using the newly created booking to assert against it.

## Performance

Request duration is measured and saved to the responseTime property of the response object. Therefore, you can add assertions to check the response time of each request.

```tsx
it("@Regression - Get Booking successfully - Response time < 1000 ms", async () => {
    const bookingId = 123456;
    const response = await bookingService.getBooking<BookingModel>(bookingId);
    response.responseTime.should.be.lessThan(1000);
  });
```

This makes adding simple but powerful performance checks to your API automation suite very easy.

## Authentication

The authentication process depends on the method required by the API, but in most cases, it involves sending tokens in the request headers.

In this repository, the API uses an `/auth` endpoint to obtain a token, which is then sent in the request headers as a cookie. To streamline this process, I’ve added an `authenticate()` method in the `ServiceBase` class, making it easy to authenticate with the API.

Additionally, the token is cached so that subsequent calls to `authenticate()` from any service do not result in unnecessary requests to the server.

Here’s the implementation of the `authenticate()` method:

```typescript
async authenticate(): Promise<void> {
  const username = process.env["USER"];
  const password = process.env["PASSWORD"];

  if (!username || !password) {
    throw new Error("Missing username or password in environment variables.");
  }

  const cachedToken = SessionManager.getCachedToken(username, password);

  if (cachedToken) {
    this.defaultConfig = {
      headers: { Cookie: "token=" + cachedToken },
    };
    return;
  }

  const credentials: CredentialsModel = { username, password };
  const response = await this.post<SessionResponse>(`${this.baseUrl}/auth`, credentials);

  SessionManager.storeToken(username, password, response.data.token);

  this.defaultConfig = {
    headers: { Cookie: "token=" + response.data.token },
  };
}
```

Then you can use it on the services that require authentication, like in the before hook below.

```tsx
describe("Delete Booking", () => {
  const bookingService = new BookingService();

  before(async () => {
    await bookingService.authenticate();
  });

  it("@Smoke - Delete Booking successfully", async () => {
    const response = await bookingService.deleteBooking<BookingResponse>(bookingId);
    response.status.should.equal(204, JSON.stringify(response.data));
  });
})
```

## Testing Generative AI

Evaluating the quality of LLM generated content can prove to be challenging due to its undeterministic nature. Traditional assertions can fall short since content generated by LLMs is highly dynamic and changes on each generation instance.

The framework has been extended to support testing for AI based applications, providing tools with enough flexibility to adapt to the unpredictable nature of LLM outputs.

Three distinct tools are included, each with a particular usage method

### Semantic similarity

Semantic similarity can be described as the measure of how similar two pieces of text are in terms of content, theme and format. We usually measure semantic similarity by comparing the embedding representation of two pieces of text using metrics such as cosine similarity or BERTScore.

The idea is to compare how similar the output of an LLM is to a certain reference across several generation instances. When we semantically compare two pieces of text we obtain a k value (usually `-1 <= k <= 1`, where a high score would indicate a high semantic similarity). We have included commands to generate reference sets and to set a baseline k value for test files. After setting a baseline for semantic comparison, we can run tests (eg: a conversation with a chatbot) and numerically interpret how similar the output is compared to our reference.

The semantic comparison implementation involves a custom test runner and a method contained within the Scorer class. We embed text by calling an external API and we use cosine similarity to compare these embeddings.
The custom runner allows us to run the same test any number of times, accounting for variation across LLM generation instances in order to set a more faithful baseline value.

In order to start using this evaluation method, first write your test in the `.spec.ts` file and make use of the `.compare()` method.
Here, an instance of `ChatBotService` represents an example of a generic, ecommerce related Chat Bot. __It simply serves as an example API__. 

```typescript

    it("Ask for availability, warranty and shipment", async () => {
    
        const greetingQuery: QueryModel = {
          query: "Good morning, how are you doing?",
        };
    
        const greetingQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(greetingQuery);
    
        await scorer.compare(greetingQueryResponse.data.response, greetingQuery.query);
    
        const smartphoneDetailsQuery: QueryModel = {
          query: "Do you have the Samsung S24 in stock?",
        };
    
        const smartphoneDetailsQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
          smartphoneDetailsQuery,
        );
    
        await scorer.compare(
          smartphoneDetailsQueryResponse.data.response,
          smartphoneDetailsQuery.query,
        );
        
    })
```

After writing the test, run the following command to generate the reference output file.

```bash
npm run set-reference
```
This will generate the following file, saving the user query and the LLM output in a .csv

```csv
user,assistant
"Good morning, how are you?","Hello! Good morning. I’m the virtual assistant for the online store, here to help you with product availability, payment options, and in-store pickup locations. How can I assist you today?"
Do you have the Samsung S24?,"Yes! We have the Samsung Galaxy S24 available. Currently, we have 30 units in stock. The price is $899.99 and it features a 6.2-inch Dynamic AMOLED 2X display, 8GB of RAM, and 128GB of storage. Would you like to know more details about the device or information about payment options?"
```

Once the reference finishes generating, set a baseline value by running the following command. The numerical argument represents the amount of iterations. Take into consideration that a big enough iteration amount will be needed to set a truthfull and accurate baseline. This will create new reference values file.

```bash
npm run set-baseline -- 2
```
This will save the result value of comparing the previously saved reference with the current LLM output, saving it in the following format. Each id corresponds to an instance where `.compare()` was used in the test file. These instances are assigned numeric ids form top to bottom.

```csv
id,result
0,0.9897245254899922
1,0.9718140438470603
0,0.9816378102097613
1,0.9931317401108518
```

We can now run the test file normally and __use the threshold value as a minimum passing score for our tests__. The reference file will be updated with relevant data obtained after running the baseline iterations.

```csv
user,assistant,mean,stdDev,threshold,iterations
"Good morning, how are you?","Hello! Good morning. I’m the virtual assistant for the online store, here to help you with product availability, payment options, and in-store pickup locations. How can I assist you today?",0.9839170547781255,0.004138037038311033,0.976250791596312,2
Do you have the Samsung S24?,"Yes! We have the Samsung Galaxy S24 available. Currently, we have 30 units in stock. The price is $899.99 and it features a 6.2-inch Dynamic AMOLED 2X display, 8GB of RAM, and 128GB of storage. Would you like to know more details about the device or information about payment options?",0.9857050704142143,0.009830292495169028,0.9619837513518913,2
```
Overall, a feature like gives us a numerical way of quickly checking how far off the output of our LLM based app is from a certain reference.

### Fact checking (Catching hallucinations)

Hallucinations refer to instances where an LLM generates factually wrong information. In the context of LLM based apps, we are interested in ensuring our output aligns with business logic and values. It is also of utmost importance to have our LLM based apps deliver accurate information to end users.

We provide a `.factCheck()` function that checks wether the output of an LLM aligns with a vectorial knowledge base, aiming to catch hallucinations. Interestingly enough, this function uses an LLM behind the scenes to search for content in a vector database and evaluate wether the main LLM output aligns with the found relevant content.

```typescript
    const smartphoneDetailsQuery: QueryModel = {
      query: "Do you have the s24 in stock?",
    };

    const smartphoneDetailsQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      smartphoneDetailsQuery,
    );

    await scorer.factCheck(
      [smartphoneDetailsQuery.query],
      smartphoneDetailsQueryResponse.data.response,
    );
```

This method queries a vector database using the query provided as the first argument and calculates a truthfulness percentage by checking the data retrieved against some content containing claims. It uses a basic RAG embedded query search behind the scenes and its expected for it to be modified depending on the use case.
We can set a threshold that determines the truthfulness score needed so that the assertion returns true by modifying parameters inside the `Scorer.ts` class or adjust this number by passing the minimum score as an argument to `.factCheck()`.

### Customizable criteria eval

Finally, we provide a general criteria evaluation method `.eval()`. This function leverages an LLM to __evaluate wether certain content satisfies a certain criteria__. Optionally, this function can make use of a vectorial db to search for additional relevant info.

```typescript
    const smartphoneDetailsQuery: QueryModel = {
      query: "Do you have the Samsung S24 in stock?",
    };

    const smartphoneDetailsQueryResponse = await chatbotService.sendMessage<ChatbotResponse>(
      smartphoneDetailsQuery,
    );

    await scorer.eval(
      [
        "The assistant must answer in a concise and effective manner",
        "The assistant's answer must inform the user about details related to the Samsung S24 such as availability and different versions",
      ],
      smartphoneDetailsQueryResponse.data.response,
    );
```

This method checks if certain content meets certain criteria by intelligently making use of LLM based judgement. It supports optional chain of though reasoning as an enhancement of traditional judgement capabilities.

## Bug Management

I have found that the strategy for dealing with open bugs on an automation project is not a solved problem, and you can find different views on this. This repo has an approach I have used in different projects, but feel free to adapt it to yours.

In this case, bugs are skipped while open, to maintain a green pipeline. The issue with this approach is that you have to have a process in place to un-skip them when they are fixed.

To do that, I add a comment on top of the test before skipping it, containing the link to the test and a visual indication with the help of the TODO Highlight extension.

To avoid unwanted skipped tests, I set an eslint rule to not allow them. Hence, besides the BUG comment, I have to add one to disable eslint for the next line. This makes it easier not to forget skipped or focused tests while helping the PR review process for the reviewer (a disabled eslint rule must have a good justification)

![Bug](./images/bug.png)

## CI / CD

This repository utilizes GitHub Actions for continuous integration and delivery (CI/CD). Our pipeline is configured to run all tests on each Pull Request or Merge to the main branch. Here is what typically happens:

1. **Linting**: The pipeline runs ESLint to check for syntax errors and enforce code style guidelines.
2. **Testing**: It executes the automated tests defined in the repository.
3. **Deployment (Optional)**: If all tests pass, the pipeline can automatically deploy your code to the production environment.

Check the [Actions](https://github.com/damianpereira86/api-framework-ts-mocha/actions) tab to see passed and failed pipelines.

![Pipeline](./images/cicd.png)

Ensure that you configure any necessary environment variables and secrets. These can be managed in the repository’s **Settings** under **Secrets and variables**.
1. Repository Variables: Go to Settings > Secrets and variables > Actions > Variables. (e.g., BASEURL)
2. Repository Secrets: Go to Settings > Secrets and variables > Actions > Secrets.(e.g., USER and PASSWORD)

You can customize the CI/CD pipeline to suit your project's needs. For example, you can adjust which branches trigger the pipeline, add steps for deployment, or configure notifications.

To get started with GitHub Actions in your project, check out the `.github/workflows` directory in this repository. Here, you'll find the workflow files that define our CI/CD processes. You can modify these files to change the pipeline or add new workflows.

See branch `features/two-step-pipeline` as an example of a pipeline that do the following:
1. Runs the Smoke tests, and fails in case any test fails, 
2. Runs the Regression tests, that do not make the pipeline fail.

### Linting in the pipeline
As mentioned above, this job will run ESLint before running the tests. In the following screenshot, the pipeline failed due to an eslint error.

![Eslint error](./images/eslint-error.png)

For more detailed examples and advanced features, refer to the [GitHub Actions Documentation](https://docs.github.com/en/actions).

## Extensions

This framework has been extended in teh past with different features such as:

- Reporter
- Schema validation
- Improved Logging
- Database integration
- And so on...

But each of them depends on the project needs, the tools of choice, etc. Hence, I’ll be adding examples of possible extensions that could be useful for some of you, while leaving this repo as light and starightforward as possible.

## Next steps

Now it’s time to use it. Go ahead and explore the test examples in this repo and adapt it to your use case. I’m sure there are much better ways to tackle some of the features of this framework, and I will be more than happy to hear them and include them in the repo. Or better, you can include them yourself!

## Contact/Support

If you have any questions, encounter any issues, or simply want to provide feedback regarding this project, I'm here to help and listen!

Here are a few ways you can reach out for support or assistance:

- **Submit an Issue**: If you find any bugs or issues, feel free to open an issue on the [GitHub issues page](https://github.com/damianpereira86/api-framework-ts-mocha/issues). Please provide as much detail as possible to help me understand and address the problem quickly.

- **Discussions**: For questions, suggestions, or general discussions about the project, please use the [Discussions](https://github.com/damianpereira86/api-framework-ts-mocha/discussions) section of the GitHub repository. This is a great place to connect with other users and contributors, share ideas, and get advice.

- **Email**: If you prefer direct communication, you can email me at [damianpereira@gmail.com](mailto:damianpereira@gmail.com). I'll try to respond as promptly as possible.

## Contribution Guidelines

I welcome contributions from everyone and value your input and ideas. Here's how you can contribute:

1. **Fork the Repository**: Begin by forking the repository to your GitHub account. This creates your own copy of the project where you can make your changes.

2. **Clone the Forked Repo**: Clone the forked repository to your local machine to start working on the changes.

    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_FORKED_REPO.git
    ```

3. **Create a New Branch**: Create a new branch on your local repository for each set of changes you want to make. This keeps your modifications organized and separate from the main project.

    ```bash
    git checkout -b your-new-branch-name
    ```

4. **Make Your Changes**: Implement your changes, fix a bug, add a new feature, or update documentation as needed in your new branch.

5. **Commit Your Changes**: Commit your changes with a clear and descriptive commit message. This message should explain what you've done and why.

    ```bash
    git commit -m "Add a concise but descriptive commit message"
    ```

6. **Push Changes to Your Fork**: Push your changes to your fork on GitHub.

    ```bash
    git push origin your-new-branch-name
    ```

7. **Submit a Pull Request**: Go to your fork on GitHub and click the 'New pull request' button. Select the original repository as the base and your branch as the compare. Fill in the pull request with a title and description that explains your changes.

8. **Wait for Review**: Wait for the review of your changes. Be ready to make additional changes based on the feedback.

9. **Merge**: Once your changes have been approved, they will be merged into the main project.

Please ensure that your code adheres to the project's standards and has passed all tests. 

I look forward to your contributions. Thank you!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.
