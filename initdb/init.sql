-- Init SQL Queries --

CREATE TABLE RECIPE (
    recipeID INT AUTO_INCREMENT NOT NULL,
    url VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    CONSTRAINT recipeID_PK PRIMARY KEY (recipeID)
);

INSERT INTO RECIPE (url, content) VALUES
('https://www.tiktok.com/@cookingwithlynja/video/7322531619825257771',
 "Brought McDonald's from Rome. I love their reviews to natural food, even though I don't think there's a carrot and anything. And McDonald's has tiramisu in Rome. Beat that. So? So they do have carrots. By the way, I take back what I said about McDonald's not having healthy food. McDonald's grapes. We'll get them next time. Pretty soft.");

