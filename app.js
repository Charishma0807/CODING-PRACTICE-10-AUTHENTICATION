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

//authenticateToken

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
    SELECT state_id as stateId,
        state_name as stateName,
        population
    FROM state
    WHERE state_id = '${stateId}';
    `;
  const state = await db.get(selectStateQuery);
  response.send(state);
});

//post method using district

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createDistrictQuery = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    VALUES (
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    );
    `;
  await db.run(createDistrictQuery);
  response.send("District Successfully Added");
});

//Returns districts based on district

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const districtQuery = `
    SELECT district_id as districtId,
    district_name as districtName,
    state_id as stateId,
    cases,cured,active,deaths
    FROM district
    WHERE district_id = '${districtId}';
    `;
    const districtArray = await db.get(districtQuery);
    response.send(districtArray);
  }
);

//Deletes a district from the district table based on the district ID

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `
    DELETE FROM
    district
    WHERE district_id = '${districtId}';
    `;
    const deleteArray = await db.run(deleteQuery);
    response.send("District Removed");
  }
);

//Updates the details of a specific district based on the district ID

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;

    const updateQuery = `
    UPDATE district
    SET district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
    WHERE district_id = '${districtId}';
    `;
    const updateArray = await db.run(updateQuery);
    response.send("District Details Updated");
  }
);

//Returns the statistics

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;

    const statsQuery = `
    SELECT 
    SUM(cases) as totalCases, 
    SUM(cured) as totalCured,
    SUM(active) as totalActive,
    SUM(deaths) as totalDeaths
    FROM district WHERE state_id='${stateId}';
    `;

    const statsResponse = await db.get(statsQuery);
    response.send(statsResponse);
  }
);

//result

module.exports = app;
