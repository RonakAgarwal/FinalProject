// MONGO DB CODE

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://exampleUser335:kRwcw0YbP9TT3ugd@cluster0.uuyhnar.mongodb.net/?retryWrites=true&w=majority";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

async function createPortfolio(name, ticker, amount) {
  try {
    await client.connect();
    const collection = client.db("stocks").collection("portfolios");

    // Find the portfolio with the given name
    const portfolio = await collection.findOne({ name });

    // If the portfolio already exists, add the ticker and amount to its list
    if (portfolio) {
      await collection.updateOne(
        { name },
        { $push: { holdings: { ticker, amount: Number(amount) } } }
      );
    } else {
      // Otherwise, create a new portfolio with the given name and holdings
      await collection.insertOne({
        name,
        holdings: [{ ticker, amount: Number(amount) }],
      });
    }
  } finally {
    await client.close();
  }
}

async function addInvestment(name, ticker, amount) {
  try {
    await client.connect();
    const collection = client.db("stocks").collection("portfolios");

    // Find the portfolio with the given name
    const portfolio = await collection.findOne({ name });

    if (portfolio) {
      // Check if there is already a holding for the stock
      const holding = portfolio.holdings.find((h) => h.ticker === ticker);
      if (holding) {
        // Add the amount to the existing holding
        const newAmount = holding.amount + Number(amount);
        await collection.updateOne(
          { _id: portfolio._id, "holdings.ticker": ticker },
          { $set: { "holdings.$.amount": newAmount } }
        );
      } else {
        // Create a new holding for the stock
        await collection.updateOne(
          { _id: portfolio._id },
          { $push: { holdings: { ticker, amount: Number(amount) } } }
        );
      }
    } else {
      // If the portfolio does not exist, create a new one
      await createPortfolio(name, ticker, amount);
    }
  } finally {
    await client.close();
  }
}

async function getPortfolioByName(name) {
  try {
    await client.connect();
    const collection = client.db("stocks").collection("portfolios");

    // Find the portfolio with the given name
    const portfolio = await collection.findOne({ name });
    return portfolio;
  } finally {
    await client.close();
  }
}

// EXPRESS CODE

const express = require("express");
const axios = require("axios");
const app = express();

app.set("views", "./");
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// Endpoint for the main page
app.get("/", (request, response) => {
  response.render("templates/index");
});

app.get("/invest", (request, response) => {
  response.render("templates/invest");
});

app.post("/processInvestment", async (req, res) => {
  const { name, ticker, amount } = req.body;

  await addInvestment(name, ticker, amount);
  res.render("templates/processInvestment", { name, ticker, amount });

  // Check if portfolio exists and add investment if it does
  // const modifiedCount = await addInvestment(name, ticker, amount);
  // if (modifiedCount !== null) {
  //  res.render("templates/processInvestment", { name, ticker, amount });
  // }

  // Create portfolio if it does not exist
  // const insertedId = await createPortfolio(name, ticker, amount);
  // res.render("templates/processInvestment", { name, ticker, amount });
});

app.get("/portfolio", (request, response) => {
  response.render("templates/portfolio");
});

app.post("/processPortfolio", async (request, response) => {
  const { acc } = request.body;
  const portfolio_data = await getPortfolioByName(acc);

  if (!portfolio_data) {
    const error_message = "Error: Portfolio not found";
    return response.send(`
      <script>alert("${error_message}"); window.location.href = "/portfolio";</script>
    `);
  }

  response.render("templates/processPortfolio", {
    name: portfolio_data.name,
    holdings: portfolio_data.holdings,
  });
});

app.get("/stocks", (request, response) => {
  response.render("templates/stocks");
});

app.post("/stockResults", async (request, response) => {
  const { ticker } = request.body;

  // Get current date
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = "01";
  const formattedDate = `${year}-${month}-${day}`;

  // Get date from one year ago
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(year - 1);
  const oneYearAgoYear = oneYearAgo.getFullYear();
  const oneYearAgoMonth = String(oneYearAgo.getMonth() + 1).padStart(2, "0");
  const oneYearAgoDay = "01";
  const formattedOneYearAgo = `${oneYearAgoYear}-${oneYearAgoMonth}-${oneYearAgoDay}`;

  const options = {
    method: "GET",
    url: "https://apistocks.p.rapidapi.com/monthly",
    params: {
      symbol: ticker,
      dateStart: formattedOneYearAgo,
      dateEnd: formattedDate,
    },
    headers: {
      "X-RapidAPI-Key": "85d67684b5mshdc4ff3300a70167p17a1afjsn1fb1de626c20",
      "X-RapidAPI-Host": "apistocks.p.rapidapi.com",
    },
  };

  try {
    const stockdata = await axios.request(options);
    const oneYearPrice = stockdata.data.Results[0].Close;
    const currentPrice =
      stockdata.data.Results[stockdata.data.Results.length - 1].Close;
    const percentDiff = ((currentPrice - oneYearPrice) / oneYearPrice) * 100;
    const stockResults = {
      ticker,
      currentPrice,
      oneYearPrice,
      yearlyChange: percentDiff.toFixed(2) + "%",
    };
    response.render("templates/stockResults", { stockResults });
  } catch (error) {
    const error_message = "Please enter a valid stock";
    return response.send(`
      <script>alert("${error_message}"); window.location.href = "/stocks";</script>
    `);
  }
});

app.listen(4000, () => {
  console.log("Server started on port 4000");
});
