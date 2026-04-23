CREATE DATABASE IF NOT EXISTS fittrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fittrack;

CREATE TABLE IF NOT EXISTS User (
    Email         VARCHAR(255) PRIMARY KEY,
    Name          VARCHAR(255) NOT NULL,
    Age           INT,
    Password_Hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Workout_Program (
    Program_ID      INT AUTO_INCREMENT PRIMARY KEY,
    Program_Name    VARCHAR(255) NOT NULL,
    Duration        VARCHAR(100),
    Creator_Email   VARCHAR(255),
    FOREIGN KEY (Creator_Email) REFERENCES User(Email) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Follows (
    User_Email  VARCHAR(255),
    Program_ID  INT,
    PRIMARY KEY (User_Email, Program_ID),
    FOREIGN KEY (User_Email) REFERENCES User(Email) ON DELETE CASCADE,
    FOREIGN KEY (Program_ID) REFERENCES Workout_Program(Program_ID) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Workout_Session (
    Session_ID      INT AUTO_INCREMENT PRIMARY KEY,
    Workout_Date    DATE NOT NULL,
    Notes           TEXT,
    User_Email      VARCHAR(255),
    Program_ID      INT,
    FOREIGN KEY (User_Email) REFERENCES User(Email) ON DELETE CASCADE,
    FOREIGN KEY (Program_ID) REFERENCES Workout_Program(Program_ID) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Exercise_Library (
    Exercise_Name        VARCHAR(255) PRIMARY KEY,
    Muscle_Groups        VARCHAR(255),
    Exercise_Type        VARCHAR(100),
    Equipment            VARCHAR(255),
    Exercise_Information TEXT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Exercise_Set_Log (
    Log_ID          INT AUTO_INCREMENT PRIMARY KEY,
    Weight_Lifted   DECIMAL(6,2),
    Weight_Unit     VARCHAR(3) DEFAULT 'kg',
    Reps            INT,
    Set_Number      INT,
    Session_ID      INT,
    Exercise_Name   VARCHAR(255),
    FOREIGN KEY (Session_ID) REFERENCES Workout_Session(Session_ID) ON DELETE CASCADE,
    FOREIGN KEY (Exercise_Name) REFERENCES Exercise_Library(Exercise_Name) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Body_Metric (
    Body_Metric_ID          INT AUTO_INCREMENT PRIMARY KEY,
    Current_Weight          DECIMAL(6,2),
    Current_Fat_Percentage  DECIMAL(5,2),
    Date                    DATE NOT NULL,
    User_Email              VARCHAR(255),
    FOREIGN KEY (User_Email) REFERENCES User(Email) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Hydration_Log (
    Hydration_ID    INT AUTO_INCREMENT PRIMARY KEY,
    Water_L         DECIMAL(5,2) NOT NULL,
    Date            DATE NOT NULL,
    User_Email      VARCHAR(255),
    FOREIGN KEY (User_Email) REFERENCES User(Email) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Food (
    Name            VARCHAR(255) PRIMARY KEY,
    Serving_Size    VARCHAR(100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Nutrient_Profile (
    Food_Name   VARCHAR(255) PRIMARY KEY,
    Carbs       DECIMAL(6,2),
    Fat         DECIMAL(6,2),
    Protein     DECIMAL(6,2),
    Calories    DECIMAL(7,2),
    FOREIGN KEY (Food_Name) REFERENCES Food(Name) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Meal (
    Meal_ID     INT AUTO_INCREMENT PRIMARY KEY,
    Meal_Type   VARCHAR(100),
    Meal_Date   DATE NOT NULL,
    User_Email  VARCHAR(255),
    FOREIGN KEY (User_Email) REFERENCES User(Email) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Meal_Food (
    Meal_ID         INT,
    Food_Name       VARCHAR(255),
    Quantity        DECIMAL(6,2),
    Quantity_Unit   VARCHAR(50),
    PRIMARY KEY (Meal_ID, Food_Name),
    FOREIGN KEY (Meal_ID) REFERENCES Meal(Meal_ID) ON DELETE CASCADE,
    FOREIGN KEY (Food_Name) REFERENCES Food(Name) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Nutrition_Log (
    Log_ID      INT AUTO_INCREMENT PRIMARY KEY,
    Log_Date    DATE NOT NULL,
    User_Email  VARCHAR(255),
    Meal_ID     INT,
    FOREIGN KEY (User_Email) REFERENCES User(Email) ON DELETE CASCADE,
    FOREIGN KEY (Meal_ID) REFERENCES Meal(Meal_ID) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Goal (
    Goal_ID                 INT AUTO_INCREMENT PRIMARY KEY,
    Target_Calories         DECIMAL(7,2),
    Target_Weight           DECIMAL(6,2),
    Target_Fat_Percentage   DECIMAL(5,2),
    Created_At              DATE NOT NULL DEFAULT (CURRENT_DATE),
    Target_Date             DATE,
    Status                  VARCHAR(20) DEFAULT 'active',
    User_Email              VARCHAR(255),
    FOREIGN KEY (User_Email) REFERENCES User(Email) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed exercise library
INSERT IGNORE INTO Exercise_Library (Exercise_Name, Muscle_Groups, Exercise_Type, Equipment) VALUES
('Barbell Squat', 'Quadriceps, Glutes, Hamstrings', 'Strength', 'Barbell'),
('Bench Press', 'Chest, Triceps, Shoulders', 'Strength', 'Barbell'),
('Deadlift', 'Back, Glutes, Hamstrings', 'Strength', 'Barbell'),
('Pull-Up', 'Back, Biceps', 'Strength', 'Pull-up Bar'),
('Overhead Press', 'Shoulders, Triceps', 'Strength', 'Barbell'),
('Barbell Row', 'Back, Biceps', 'Strength', 'Barbell'),
('Dumbbell Curl', 'Biceps', 'Strength', 'Dumbbell'),
('Tricep Dip', 'Triceps, Chest', 'Strength', 'Parallel Bars'),
('Leg Press', 'Quadriceps, Glutes', 'Strength', 'Machine'),
('Running', 'Cardiovascular, Legs', 'Cardio', 'None'),
('Cycling', 'Cardiovascular, Legs', 'Cardio', 'Bike'),
('Plank', 'Core', 'Strength', 'None'),
('Push-Up', 'Chest, Triceps, Shoulders', 'Strength', 'None'),
('Lat Pulldown', 'Back, Biceps', 'Strength', 'Cable Machine'),
('Leg Curl', 'Hamstrings', 'Strength', 'Machine');

-- Seed food items
INSERT IGNORE INTO Food (Name, Serving_Size) VALUES
('Chicken Breast', '100g'),
('Brown Rice', '100g'),
('Broccoli', '100g'),
('Egg', '1 large'),
('Oats', '100g'),
('Banana', '1 medium'),
('Salmon', '100g'),
('Sweet Potato', '100g'),
('Greek Yogurt', '100g'),
('Almonds', '30g'),
('Whole Milk', '250ml'),
('Whey Protein', '30g scoop'),
('White Rice', '100g'),
('Avocado', '100g'),
('Spinach', '100g');

INSERT IGNORE INTO Nutrient_Profile (Food_Name, Carbs, Fat, Protein, Calories) VALUES
('Chicken Breast', 0, 3.6, 31, 165),
('Brown Rice', 23, 0.9, 2.6, 112),
('Broccoli', 7, 0.4, 2.8, 34),
('Egg', 0.6, 5, 6, 72),
('Oats', 66, 7, 17, 389),
('Banana', 27, 0.3, 1.3, 105),
('Salmon', 0, 13, 25, 208),
('Sweet Potato', 20, 0.1, 1.6, 86),
('Greek Yogurt', 3.6, 0.4, 10, 59),
('Almonds', 6, 14, 6, 164),
('Whole Milk', 12, 8, 8, 149),
('Whey Protein', 3, 2, 25, 120),
('White Rice', 28, 0.3, 2.7, 130),
('Avocado', 9, 15, 2, 160),
('Spinach', 3.6, 0.4, 2.9, 23);
