const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
app.use(express.json());

let db = null;

//initializationDbAndServer

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running At http:localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
  }
};

initializeDbAndServer();

const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "Charishma", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};
//post method api

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `
    SELECT *
    FROM user
    WHERE 
        username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "Charishma");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//get method api

app.get("/states/", authenticateToken, async (request, response) => {
  const stateQuery = `
        SELECT state_id as stateId,
        state_name as stateName,
        population
        FROM state
        ;
    `;
  const stateArray = await db.all(stateQuery);
  response.send(stateArray);
});

//states,states_id using get method API

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const selectStateQuery = `
    SELECT *
    FROM state
    WHERE state_id = '${stateId}';
    `;
  const state = await db.get(selectStateQuery);
  response.send(state);
});

//result

module.exports = app;
