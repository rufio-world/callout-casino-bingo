import { Avatar } from "@/types/game";

// Default avatar options for the bingo game
export const AVATAR_OPTIONS: Avatar[] = [
  // Animals
  { name: "Fox", image: "🦊", category: "Animals" },
  { name: "Panda", image: "🐼", category: "Animals" },
  { name: "Tiger", image: "🐯", category: "Animals" },
  { name: "Lion", image: "🦁", category: "Animals" },
  { name: "Bear", image: "🐻", category: "Animals" },
  { name: "Wolf", image: "🐺", category: "Animals" },
  { name: "Cat", image: "🐱", category: "Animals" },
  { name: "Dog", image: "🐶", category: "Animals" },
  
  // Mythical Creatures
  { name: "Dragon", image: "🐉", category: "Mythical" },
  { name: "Unicorn", image: "🦄", category: "Mythical" },
  { name: "Phoenix", image: "🔥", category: "Mythical" },
  { name: "Fairy", image: "🧚", category: "Mythical" },
  { name: "Wizard", image: "🧙", category: "Mythical" },
  { name: "Knight", image: "⚔️", category: "Mythical" },
  
  // People
  { name: "Astronaut", image: "👨‍🚀", category: "People" },
  { name: "Pirate", image: "🏴‍☠️", category: "People" },
  { name: "Ninja", image: "🥷", category: "People" },
  { name: "Chef", image: "👨‍🍳", category: "People" },
  { name: "Artist", image: "👨‍🎨", category: "People" },
  { name: "Scientist", image: "👨‍🔬", category: "People" },
  
  // Objects
  { name: "Crown", image: "👑", category: "Objects" },
  { name: "Diamond", image: "💎", category: "Objects" },
  { name: "Star", image: "⭐", category: "Objects" },
  { name: "Trophy", image: "🏆", category: "Objects" },
  { name: "Rocket", image: "🚀", category: "Objects" },
  { name: "Castle", image: "🏰", category: "Objects" },
];

export const getAvatarByName = (name: string): Avatar | undefined => {
  return AVATAR_OPTIONS.find(avatar => avatar.name.toLowerCase() === name.toLowerCase());
};

export const getRandomAvatar = (): Avatar => {
  return AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
};

export const getAvatarsByCategory = (category: Avatar['category']): Avatar[] => {
  return AVATAR_OPTIONS.filter(avatar => avatar.category === category);
};