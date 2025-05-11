# Markr

This project is a data ingest and processing microserver for multiple-choice question (MCQ) results.
It focuses on ingesting XML documents from old grading machines, storing the results and providing an API
for aggregated statistics.

## Project Goal

The primary goal is to develop a microservice that can:

1. **Ingest XML Documents**
2. **Persistently Store** these results in a database
3. **Handle duplicate submissions**, prioritising records with the most marks
4. **Validate incoming data** and reject entire documents if format is incorrect
5. **Provide an API Endpoint** to retrieve aggregate statistics

## Key Assumptions

Based on the problem description and typical system behaviors, the following assumptions were made:

- **XML Data Source:** The input XML format, while not strictly defined, is expected to have a root element `<mcq-test-results>` containing one or more `<mcq-test-result>` child elements. All other results within `<mcq-test-result>` are ignored.
- **`<summary-marks>` Reliability:** The `<summary-marks>` element within each `<mcq-test-result>` (with its `@available` and `@obtained` attributes) is considered the definitive source for a student's score on a test. Individual `<answer>` elements are ignored
- **Duplicate Handling:**
  - If multiple results for the same student (`student-number`) and `test-id` are ingested (either in the same XML document or across multiple requests), the entry with the highest `obtainedMarks` score is persisted or updated.
  - The `availableMarks`, `firstName`, `lastName`, and `scannedOn` date from the record that provided the highest `obtainedMarks` will be the values stored.
  - For aggregation, the `availableMarks` for percentage calculations will be the maximum `availableMarks` found across all valid submissions for that specific `test-id`.
- **Error Handling (Document Rejection):**
  - Malformed XML that cannot be parsed will cause the entire request to be rejected.
  - If an XML document is parsable but any `<mcq-test-result>` element within it is missing essential fields (e.g., `first-name`, `last-name`, `student-number`, `test-id`, `scanned-on`, or valid `summary-marks` attributes), the _entire document_ will be rejected.
- **Content Type:** The `/import` endpoint strictly expects a `Content-Type` header of `text/xml+markr`. Other content types will be rejected.
- **Database:**
  - PostgreSQL is used as the persistent data store, managed via TypeORM.
  - Checks for Available Marks and Obtained Marks are not implemented (but commented in);
- **Environment:** The application is designed to be run using Docker and Docker Compose.
- **Security (Prototype Scope):**
  - HTTPS/SSL for the `/import` endpoint is not implemented.
  - XML parsing is handled by `fast-xml-parser`.

## Approach Taken

- **Framework & Language:** Node.js with Express.js (TypeScript for type safety and improved maintainability).
- **Database:** PostgreSQL with TypeORM as the Object-Relational Mapper. The `StudentTestResult` entity defines the database schema. An index is automatically created on `testId` (as part of the composite primary key with `studentNumber`) which benefits lookups for aggregation.
- **XML Parsing:** The `fast-xml-parser` library is used for efficient XML parsing. It's configured to ignore attributes and parse specific fields.
- **API Endpoints:**
  - `POST /import`: Ingests XML data (`text/xml+markr`). Handles validation and duplicate logic within the `ImportTestResultsService`.
  - `GET /results/:testId/aggregate`: Returns JSON aggregate statistics calculated by the `TestResultService`. Calculations are performed after fetching relevant records.
- **Project Structure:**
  ```
  src/
  ├── controllers/  # API request handlers
  ├── data-source.ts # TypeORM configuration
  ├── entity/       # Database models (TypeORM entities)
  ├── index.ts      # Application entry point & server setup
  ├── middleware/   # Custom Express middleware (e.g., error handling)
  ├── repository/   # Data access layer
  ├── services/     # Business logic
  └── utils/        # Shared utilities (e.g., statistics)
  ```
- **Error Handling:**
  - A global error handling middleware is implemented in Express. Controllers provide specific HTTP error responses for known issues (e.g., validation errors, unsupported media types).
  - No Logger has been implemented.
- **Testing:** Unit tests for services and utility functions, and End-to-End (E2E) tests for API endpoints are written using Vitest and Supertest.

## Performance Considerations (Prototype)

- **Aggregation:** The current aggregation logic fetches all results for a given `testId` from the database into application memory before performing statistical calculations. While suitable for a prototype and moderately sized tests, this approach could face performance degradation with extremely large datasets (i.e., a single test taken by tens of thousands of students).
  - _Future Enhancement:_ For very large datasets, performing aggregations directly within the database using stored procedures
- **Indexing:** The `testId` and `studentNumber` columns form a composite primary key, which is inherently indexed. This significantly speeds up lookups for individual records (e.g., during duplicate checks) and helps when filtering by `testId` for aggregation.

## How to Build and Run

### Prerequisites:

- Node.js (v16 or higher recommended)
- npm or yarn
- Docker
- Docker Compose

### Steps:

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/lachy-goob/Markr
    cd Markr
    ```

2.  **Set up Environment Variables:**
    Modify `.env` as needed. The default values are configured to work with the `docker-compose.yml` setup.

    ```dotenv
    # .env
    DATABASE_HOST=db
    DATABASE_PORT=5432
    POSTGRES_USER=markr_user
    POSTGRES_PASSWORD=markr_password
    POSTGRES_DB=markr_db
    NODE_ENV=development
    ```

3.  **Build and Run using Docker Compose:**

    ```bash
    docker-compose up --build -d
    ```

    Builds the Docker images (if they don't exist or have changed) and starts the `app` (Node.js application) and `db` (PostgreSQL) services in detached mode.
    The application will be accessible at `http://localhost:4567`.

4.  **Accessing the Service:**

    - **Import Data:**
      Create a sample XML file (e.g., `my_results.xml` based on the provided `sample_results.xml` or the problem description format).

      ```bash
      curl -X POST -H 'Content-Type: text/xml+markr' --data-binary "@my_results.xml" http://localhost:4567/import
      ```

    - **Get Aggregates:**
      Replace `1234` with an actual `test-id` that has been imported.
      ```bash
      curl http://localhost:4567/results/1234/aggregate
      ```
      _Example output (if only one result with 13/20 marks was imported for test 1234):_
      ```json
      {
        "mean": 65.0,
        "stddev": 0.0,
        "min": 65.0,
        "max": 65.0,
        "p25": 65.0,
        "p50": 65.0,
        "p75": 65.0,
        "count": 1
      }
      ```

5.  **Running Tests:**
    The best way I found to run my tests was through a seperate docker instance:

    ```bash
    docker compose --profile test up --build test
    ```

    This command will execute the test suite defined in `package.json`, which runs Vitest. E2E tests will clear test data after each run.
    It was automatically close after testing has been completed.

6.  **Stopping the Services:**
    To stop the application and database containers:

    ```bash
    docker-compose down
    ```

    To stop and remove volumes (deleting database data):

    ```bash
    docker-compose down -v
    ```

7.  **Considerations for Real Time Dashboard:**

The current implementation will quickly become a bottleneck with real-time dashboards, as it calculates statistics after retrieving all records fro teh database.

1. Database Aggregation
   SQL supports Aggregate Functions `average, min, max, count, percentile_count etc.`. This would significally lower the data transfer between db and app.

2. Aggregation Table

When new test results are added, trigger a `TestAggregateStat` function that updates a similiar table. This would be greatly beneficial for aggregate lookup, however would add a lot of overhead during data ingestion.

3. Caching

Add a Caching layer to handle frequently accessed tests.
