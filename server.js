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

async function addApplicationToDatabase(name, email, gpa) {
  try {
    await client.connect();
    await client.db("myapp").collection("applications").insertOne({
      name,
      email,
      gpa,
    });
  } finally {
    await client.close();
  }
}

async function findApplicationsByEmail(email) {
  try {
    await client.connect();
    const result = await client
      .db("myapp")
      .collection("applications")
      .find({ email })
      .toArray();
    return result.map(({ name, email, gpa }) => ({ name, email, gpa }));
  } finally {
    await client.close();
  }
}

// EXPRESS CODE

const express = require("express");
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

app.get("/portfolio", (request, response) => {
  response.render("templates/portfolio");
});

app.get("/stocks", (request, response) => {
  response.render("templates/stocks");
});


// ------------- OLD CODE -----------

app.post("/processApplication", async (request, response) => {
  const { name, email, gpa, backgroundInformation } = request.body;
  await addApplicationToDatabase(name, email, gpa, backgroundInformation);
  response.render("templates/processApplication", { name, email, gpa, backgroundInformation });
});

app.post("/processReviewApplication", async (request, response) => {
  const { email } = request.body;
  const applications = await findApplicationsByEmail(email);
  response.render("templates/processReviewApplication", { applications });
});

// ----------- OLD CODE -----------

app.listen(4000, () => {
  console.log("Server started on port 4000");
});