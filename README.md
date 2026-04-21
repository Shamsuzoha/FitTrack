# FitTrack

A full-stack fitness tracking web application for logging workouts, nutrition, hydration, body metrics, and goals — all in one place.

\---

## Features

* **Authentication** — Register and log in with email and password (bcrypt hashed)
* **Dashboard** — Daily snapshot of calories, macros, hydration, active goals, and recent workouts
* **Workouts** — Log sessions with exercises, sets, reps, and weights; organise sessions under workout programs; browse the exercise library
* **Nutrition** — Track meals and food items by day; view calorie and macro breakdowns (protein, carbs, fat)
* **Hydration** — Log daily water intake in litres with quick-add buttons and a 7-day history
* **Body Metrics** — Record weight and body fat percentage over time
* **Goals** — Create targets for calories, weight, and body fat with a deadline; mark goals as achieved or abandoned
* **Body Metrics** — track weight and body fat percentage over time (already in the code but missing from the features list)
* **Exercise Library** — searchable catalogue of exercises with muscle groups and equipment info

\---

## Tech Stack

|Layer|Technology|
|-|-|
|Frontend|Vanilla HTML, CSS, JavaScript|
|Backend|Node.js, Express|
|Database|MySQL|
|Auth|bcryptjs|
|Fonts|Syne, DM Sans (Google Fonts)|

\---

## Project Structure

```
fittrack/
├── backend/
│   ├── server.js      # Express server \& all API routes
│   ├── db.js          # MySQL connection pool
│   └── schema.sql     # Database schema + seed data
└── frontend/
    ├── index.html     # Single-page app shell
    ├── css/
    │   └── main.css   # All styles
    └── js/
        └── app.js     # Frontend logic (App, Dashboard, Workouts, Nutrition, Hydration, Goals)
```

\---

## Getting Started

### Prerequisites

* Node.js v18+
* MySQL 8+

### 1\. Clone the repository

```bash
git clone https://github.com/your-username/fittrack.git
cd fittrack
```

### 2\. Install dependencies

```bash
cd backend
npm install
```

### 3\. Set up the database

```bash
mysql -u root -p < backend/schema.sql
```

This creates the `fittrack` database, all tables, and seeds the exercise library (15 exercises) and food library (15 foods with nutrient profiles).

### 4\. Configure environment variables

Create a `.env` file in the `backend/` directory:

```env
DB\_HOST=localhost
DB\_PORT=3306
DB\_USER=root
DB\_PASSWORD=your\_password
DB\_NAME=fittrack
PORT=3001
```

### 5\. Start the server

```bash
cd backend
node server.js
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

\---

## API Reference

All endpoints are prefixed with `/api`.

### Auth

|Method|Endpoint|Description|
|-|-|-|
|`POST`|`/auth/register`|Create a new account|
|`POST`|`/auth/login`|Log in and return user data|
|`PUT`|`/users/:email`|Update name or age|

### Workouts

|Method|Endpoint|Description|
|-|-|-|
|`GET`|`/workouts/sessions?user=`|List all sessions for a user|
|`GET`|`/workouts/sessions/:id`|Get session details with sets|
|`POST`|`/workouts/sessions`|Create a new session|
|`DELETE`|`/workouts/sessions/:id`|Delete a session|
|`POST`|`/workouts/sets`|Log a set to a session|
|`DELETE`|`/workouts/sets/:id`|Delete a set|
|`GET`|`/workouts/programs?user=`|List programs for a user|
|`POST`|`/workouts/programs`|Create a new program|

### Nutrition

|Method|Endpoint|Description|
|-|-|-|
|`GET`|`/nutrition/meals?user=\&date=`|Get all meals for a date|
|`GET`|`/nutrition/calories?user=\&date=`|Get total calories and macros for a date|
|`GET`|`/nutrition/history?user=`|7-day calorie history|
|`POST`|`/nutrition/meals`|Create a meal|
|`DELETE`|`/nutrition/meals/:id`|Delete a meal|
|`POST`|`/nutrition/meals/:meal\_id/foods`|Add a food item to a meal|
|`DELETE`|`/nutrition/meals/:meal\_id/foods/:food\_name`|Remove a food item from a meal|

### Hydration

|Method|Endpoint|Description|
|-|-|-|
|`GET`|`/hydration?user=\&date=`|Get hydration logs|
|`GET`|`/hydration/today?user=\&date=`|Get total water for a day|
|`GET`|`/hydration/history?user=`|7-day hydration history|
|`POST`|`/hydration`|Log water intake|
|`DELETE`|`/hydration/:id`|Delete a log entry|

### Body Metrics

|Method|Endpoint|Description|
|-|-|-|
|`GET`|`/body?user=`|Get last 30 body metric entries|
|`POST`|`/body`|Log weight and body fat|
|`DELETE`|`/body/:id`|Delete an entry|

### Goals

|Method|Endpoint|Description|
|-|-|-|
|`GET`|`/goals?user=`|List all goals for a user|
|`POST`|`/goals`|Create a new goal|
|`PUT`|`/goals/:id/status`|Update goal status (`active`, `achieved`, `abandoned`)|
|`DELETE`|`/goals/:id`|Delete a goal|

### Exercises \& Foods

|Method|Endpoint|Description|
|-|-|-|
|`GET`|`/exercises?q=`|Search exercise library|
|`POST`|`/exercises`|Add a custom exercise|
|`GET`|`/foods?q=`|Search food library|
|`POST`|`/foods`|Add a custom food with nutrient profile|

### Dashboard

|Method|Endpoint|Description|
|-|-|-|
|`GET`|`/dashboard?user=\&date=`|Aggregated daily summary|

\---

## Database Schema

The MySQL schema includes 13 tables:

* `User` — accounts (email PK, name, age, hashed password)
* `Workout\_Program` — reusable programs created by users
* `Follows` — junction table linking users to programs
* `Workout\_Session` — individual workout sessions
* `Exercise\_Library` — searchable exercise catalogue
* `Exercise\_Set\_Log` — sets logged within a session
* `Body\_Metric` — weight and fat percentage entries
* `Hydration\_Log` — daily water intake entries
* `Food` — food items with serving sizes
* `Nutrient\_Profile` — calorie and macro data per food
* `Meal` — a typed meal (breakfast, lunch, etc.) on a date
* `Meal\_Food` — junction table linking foods to meals with quantity
* `Nutrition\_Log` — nutrition log entries
* `Goal` — user fitness goals with status tracking

\---

## Seed Data

The schema pre-populates:

**Exercises (15):** Barbell Squat, Bench Press, Deadlift, Pull-Up, Overhead Press, Barbell Row, Dumbbell Curl, Tricep Dip, Leg Press, Running, Cycling, Plank, Push-Up, Lat Pulldown, Leg Curl

**Foods (15):** Chicken Breast, Brown Rice, Broccoli, Egg, Oats, Banana, Salmon, Sweet Potato, Greek Yogurt, Almonds, Whole Milk, Whey Protein, White Rice, Avocado, Spinach

\---

## Environment Variables

|Variable|Default|Description|
|-|-|-|
|`DB\_HOST`|`localhost`|MySQL host|
|`DB\_PORT`|`3306`|MySQL port|
|`DB\_USER`|`root`|MySQL username|
|`DB\_PASSWORD`|*(empty)*|MySQL password|
|`DB\_NAME`|`fittrack`|Database name|
|`PORT`|`3001`|Express server port|

\---

## License

MIT

