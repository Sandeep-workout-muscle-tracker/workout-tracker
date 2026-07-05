// Nutrition per 100g: { kcal, protein, carbs, fiber, fat }
const FOODS = [
  // Non-veg protein
  { id: "chicken_breast", name: "Chicken Breast (cooked)", cat: "protein", kcal: 165, protein: 31, carbs: 0, fiber: 0, fat: 3.6 },
  { id: "mutton", name: "Mutton (cooked, lean)", cat: "protein", kcal: 250, protein: 25, carbs: 0, fiber: 0, fat: 16 },
  { id: "fish_rohu", name: "Fish - Rohu (cooked)", cat: "protein", kcal: 127, protein: 21, carbs: 0, fiber: 0, fat: 4 },
  { id: "salmon", name: "Salmon (cooked)", cat: "protein", kcal: 208, protein: 20, carbs: 0, fiber: 0, fat: 13 },
  { id: "egg_whole", name: "Egg, whole (boiled)", cat: "protein", kcal: 155, protein: 13, carbs: 1.1, fiber: 0, fat: 11 },
  { id: "egg_white", name: "Egg White", cat: "protein", kcal: 52, protein: 11, carbs: 0.7, fiber: 0, fat: 0.2 },
  { id: "prawns", name: "Prawns / Shrimp (cooked)", cat: "protein", kcal: 99, protein: 24, carbs: 0.2, fiber: 0, fat: 0.3 },
  { id: "whey_protein", name: "Whey Protein Powder", cat: "protein", kcal: 400, protein: 80, carbs: 8, fiber: 1, fat: 6 },

  // Legumes / plant protein
  { id: "chickpeas", name: "Chickpeas (cooked)", cat: "legume", kcal: 164, protein: 8.9, carbs: 27, fiber: 7.6, fat: 2.6 },
  { id: "lentils", name: "Lentils / Dal (cooked)", cat: "legume", kcal: 116, protein: 9, carbs: 20, fiber: 7.9, fat: 0.4 },
  { id: "kidney_beans", name: "Kidney Beans / Rajma (cooked)", cat: "legume", kcal: 127, protein: 8.7, carbs: 22.8, fiber: 6.4, fat: 0.5 },
  { id: "black_beans", name: "Black Beans (cooked)", cat: "legume", kcal: 132, protein: 8.9, carbs: 23.7, fiber: 8.7, fat: 0.5 },
  { id: "soybean", name: "Soybean (cooked)", cat: "legume", kcal: 173, protein: 16.6, carbs: 9.9, fiber: 6, fat: 9 },
  { id: "tofu", name: "Tofu", cat: "legume", kcal: 76, protein: 8, carbs: 1.9, fiber: 0.3, fat: 4.8 },
  { id: "peanuts", name: "Peanuts (roasted)", cat: "legume", kcal: 567, protein: 25.8, carbs: 16.1, fiber: 8.5, fat: 49.2 },

  // Grains / carbs
  { id: "rice_white", name: "White Rice (cooked)", cat: "grain", kcal: 130, protein: 2.7, carbs: 28, fiber: 0.4, fat: 0.3 },
  { id: "rice_brown", name: "Brown Rice (cooked)", cat: "grain", kcal: 111, protein: 2.6, carbs: 23, fiber: 1.8, fat: 0.9 },
  { id: "oats", name: "Oats (dry)", cat: "grain", kcal: 389, protein: 16.9, carbs: 66, fiber: 10.6, fat: 6.9 },
  { id: "wheat_roti", name: "Wheat Roti / Chapati", cat: "grain", kcal: 297, protein: 11, carbs: 59, fiber: 11, fat: 3.7 },
  { id: "quinoa", name: "Quinoa (cooked)", cat: "grain", kcal: 120, protein: 4.4, carbs: 21.3, fiber: 2.8, fat: 1.9 },
  { id: "sweet_potato", name: "Sweet Potato (boiled)", cat: "grain", kcal: 90, protein: 2, carbs: 20.7, fiber: 3.3, fat: 0.1 },
  { id: "potato", name: "Potato (boiled)", cat: "grain", kcal: 87, protein: 1.9, carbs: 20.1, fiber: 1.8, fat: 0.1 },
  { id: "bread_whole_wheat", name: "Whole Wheat Bread", cat: "grain", kcal: 247, protein: 13, carbs: 41, fiber: 7, fat: 3.4 },

  // Vegetables
  { id: "broccoli", name: "Broccoli (cooked)", cat: "vegetable", kcal: 35, protein: 2.4, carbs: 7.2, fiber: 3.3, fat: 0.4 },
  { id: "spinach", name: "Spinach (cooked)", cat: "vegetable", kcal: 23, protein: 2.9, carbs: 3.6, fiber: 2.4, fat: 0.4 },
  { id: "carrot", name: "Carrot (raw)", cat: "vegetable", kcal: 41, protein: 0.9, carbs: 9.6, fiber: 2.8, fat: 0.2 },
  { id: "cauliflower", name: "Cauliflower (cooked)", cat: "vegetable", kcal: 25, protein: 1.9, carbs: 5, fiber: 2.4, fat: 0.3 },
  { id: "cucumber", name: "Cucumber (raw)", cat: "vegetable", kcal: 15, protein: 0.7, carbs: 3.6, fiber: 0.5, fat: 0.1 },
  { id: "tomato", name: "Tomato (raw)", cat: "vegetable", kcal: 18, protein: 0.9, carbs: 3.9, fiber: 1.2, fat: 0.2 },
  { id: "bell_pepper", name: "Bell Pepper (raw)", cat: "vegetable", kcal: 31, protein: 1, carbs: 6, fiber: 2.1, fat: 0.3 },
  { id: "green_beans", name: "Green Beans (cooked)", cat: "vegetable", kcal: 35, protein: 1.8, carbs: 7.9, fiber: 3.4, fat: 0.2 },
  { id: "cabbage", name: "Cabbage (raw)", cat: "vegetable", kcal: 25, protein: 1.3, carbs: 5.8, fiber: 2.5, fat: 0.1 },
  { id: "onion", name: "Onion (raw)", cat: "vegetable", kcal: 40, protein: 1.1, carbs: 9.3, fiber: 1.7, fat: 0.1 },

  // Fruits
  { id: "banana", name: "Banana", cat: "fruit", kcal: 89, protein: 1.1, carbs: 22.8, fiber: 2.6, fat: 0.3 },
  { id: "apple", name: "Apple", cat: "fruit", kcal: 52, protein: 0.3, carbs: 13.8, fiber: 2.4, fat: 0.2 },
  { id: "orange", name: "Orange", cat: "fruit", kcal: 47, protein: 0.9, carbs: 11.8, fiber: 2.4, fat: 0.1 },
  { id: "avocado", name: "Avocado", cat: "fruit", kcal: 160, protein: 2, carbs: 8.5, fiber: 6.7, fat: 14.7 },

  // Dairy alternatives / other
  { id: "almonds", name: "Almonds", cat: "nuts", kcal: 579, protein: 21.2, carbs: 21.6, fiber: 12.5, fat: 49.9 },
  { id: "walnuts", name: "Walnuts", cat: "nuts", kcal: 654, protein: 15.2, carbs: 13.7, fiber: 6.7, fat: 65.2 },
  { id: "olive_oil", name: "Olive Oil", cat: "fat", kcal: 884, protein: 0, carbs: 0, fiber: 0, fat: 100 },
];

const FOOD_CATS = {
  protein: "Protein (non-veg / whey)",
  legume: "Legumes / Plant Protein",
  grain: "Grains / Starches",
  vegetable: "Vegetables",
  fruit: "Fruits",
  nuts: "Nuts",
  fat: "Oils / Fats",
};
