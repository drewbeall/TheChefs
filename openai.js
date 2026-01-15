import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "gpt-5.2",
    input: "Intake this transcript and create a recipe with cooking instructions based off of it. It should be structured as follows: Bulleted list of ingredients, followed by a numbered, step by step list of instructions. Here is the transcript: So a lot of you like to remind me that I'm fat, but recently some of you have noticed that I've lost weight, which I appreciate. I'm down about 70 pounds from when I started three years ago. And honestly, I'm happy with that. It would be more. But my problem isn't over eating. I just enjoy eating high calorie foods. For instance, garlic, butter, chicken, chicken thighs, soy sauce, garlic powder, salt and white pepper. Now slice up some green onions, separate the whites from the greens. I just missed all that. That's cool. And then roughly chop a lot of garlic food lube in a hot skillet and in with our meat. You want it hot so you can get those nice charred bits. And go ahead and remove it once it's fully cooked. Now lower your heat and add in your garlic and whites. And once it's nice and fragrant, add in soy sauce, mirin, a lob of butter and a little bit of honey. Once it's nice and reduced, add back in your chicken and then finish off with some green onions.",
});

console.log("Response:");
console.log(response.output_text);
