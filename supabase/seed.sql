-- Seed data: 3 branching stories for kids
-- Run this after schema.sql

-- Story 1: The Dragon's Egg (age 4-8)
insert into public.stories (title, summary, cover_image, price, age_range, story_tree)
values (
  'The Dragon''s Egg',
  'You discover a glowing egg deep in the Whispering Forest. Will you befriend the baby dragon or help it find its mother?',
  null,
  0,
  '4-8',
  '{
    "start": {
      "text": "You are walking through the Whispering Forest when you spot something glowing behind a mossy rock. You peek behind it and find a beautiful golden egg, warm to the touch! It starts to wobble and crack.",
      "choices": [
        { "label": "Stay and watch it hatch", "next": "watch_hatch" },
        { "label": "Run to the village for help", "next": "get_help" }
      ]
    },
    "watch_hatch": {
      "text": "Crack! A tiny dragon pokes its head out of the shell. It has sparkly green eyes and little purple wings. It looks up at you and makes a happy chirping sound!",
      "choices": [
        { "label": "Offer it some berries from your bag", "next": "feed_dragon" },
        { "label": "Look around for its mother", "next": "search_mother" }
      ]
    },
    "get_help": {
      "text": "You run to the village and find Old Maple, the wise storyteller. She smiles and says, \"Ah, a dragon egg! The mother must be searching for it. Let me come with you.\" Together you hurry back to the forest.",
      "choices": [
        { "label": "Lead her to the egg", "next": "search_mother" }
      ]
    },
    "feed_dragon": {
      "text": "The baby dragon gobbles up the berries and nuzzles against your hand. It flaps its tiny wings and tries to follow you everywhere. You realize it thinks you are its family!",
      "choices": [
        { "label": "Take the dragon home as your friend", "next": "ending_befriend" }
      ]
    },
    "search_mother": {
      "text": "You hear a deep, gentle rumble from above the treetops. A large silver dragon lands softly in the clearing. She sniffs the egg and looks at you with kind, grateful eyes.",
      "choices": [
        { "label": "Carefully give her the egg", "next": "ending_reunite" }
      ]
    },
    "ending_befriend": {
      "text": "You and the baby dragon become the best of friends! You name it Spark. Every day after school, you play together in the forest. Spark grows bigger and learns to blow tiny smoke rings just for you. The end!",
      "choices": []
    },
    "ending_reunite": {
      "text": "The mother dragon gently picks up her baby and wraps it in her warm wings. Before flying away, she leans down and touches her nose to your forehead. A small golden scale appears in your hand -- a gift to remember her by. The end!",
      "choices": []
    }
  }'::jsonb
);

-- Story 2: Ocean Adventure (age 4-8)
insert into public.stories (title, summary, cover_image, price, age_range, story_tree)
values (
  'Ocean Adventure',
  'A talking fish named Coral needs your help to find a lost treasure hidden somewhere in the deep blue sea!',
  null,
  0,
  '4-8',
  '{
    "start": {
      "text": "You are splashing in the shallow waves at the beach when a bright blue fish pops its head out of the water. \"Hey! My name is Coral, and I need your help!\" it says. \"The Golden Shell has been lost, and without it, the reef is losing its colors!\"",
      "choices": [
        { "label": "Dive into the water to help Coral", "next": "dive_in" },
        { "label": "Ask Coral for more details first", "next": "ask_details" }
      ]
    },
    "dive_in": {
      "text": "You take a deep breath and dive under the waves. Magically, you can breathe underwater! Coral leads you past colorful anemones to a sandy crossroads. One path goes to a dark underwater cave, the other to a sunken pirate ship.",
      "choices": [
        { "label": "Explore the dark cave", "next": "cave_path" },
        { "label": "Swim to the pirate ship", "next": "ship_path" }
      ]
    },
    "ask_details": {
      "text": "Coral explains, \"The Golden Shell was stolen by a grumpy octopus named Inksworth. He hides in either his cave or the old shipwreck.\" Coral gives you a magic bubble so you can breathe underwater. Time to dive in!",
      "choices": [
        { "label": "Head to the cave where Inksworth might be", "next": "cave_path" },
        { "label": "Check the old shipwreck first", "next": "ship_path" }
      ]
    },
    "cave_path": {
      "text": "Inside the cave, you find Inksworth the octopus sitting on a pile of shiny things. He looks sad, not grumpy. \"I only took the shell because no one ever visits me,\" he sniffles. \"I just wanted a friend.\"",
      "choices": [
        { "label": "Offer to be his friend if he returns the shell", "next": "ending_friendship" }
      ]
    },
    "ship_path": {
      "text": "The pirate ship is full of old treasure chests! You and Coral search everywhere. Behind the ship''s wheel, you find a treasure map drawn by Inksworth. It shows the Golden Shell is hidden inside a giant clamshell near the reef!",
      "choices": [
        { "label": "Follow the map to the giant clamshell", "next": "ending_treasure" }
      ]
    },
    "ending_friendship": {
      "text": "Inksworth smiles with all eight arms and hands you the Golden Shell. You place it back on the reef, and brilliant colors burst across the ocean like a rainbow. Now Inksworth visits the reef every day to play with you and Coral. The end!",
      "choices": []
    },
    "ending_treasure": {
      "text": "You swim to the giant clamshell and gently open it. Inside, the Golden Shell glows like sunshine! You bring it back to the reef, and all the fish cheer as the colors swirl back to life. Coral gives you a tiny pearl as a thank-you gift. The end!",
      "choices": []
    }
  }'::jsonb
);

-- Story 3: Space Mission (age 8-12)
insert into public.stories (title, summary, cover_image, price, age_range, story_tree)
values (
  'Space Mission',
  'Your spaceship crash-lands on a mysterious planet. Explore alien caves, decode strange signals, and find a way home!',
  null,
  0,
  '8-12',
  '{
    "start": {
      "text": "Warning lights flash across your cockpit as your spaceship, the Star Hopper, makes an emergency landing on an uncharted planet. The air outside is breathable but thick with purple mist. Your radio crackles with a strange repeating signal, and nearby you can see the entrance to a glowing cave.",
      "choices": [
        { "label": "Investigate the glowing cave", "next": "explore_cave" },
        { "label": "Try to decode the strange signal", "next": "decode_signal" }
      ]
    },
    "explore_cave": {
      "text": "The cave walls shimmer with bioluminescent crystals that pulse like a heartbeat. Deep inside, you find ancient carvings on the wall showing a star map. One carving looks exactly like your ship! Someone has been here before.",
      "choices": [
        { "label": "Follow the star map deeper into the cave", "next": "deep_cave" },
        { "label": "Take a crystal sample and go back to your ship", "next": "crystal_power" }
      ]
    },
    "decode_signal": {
      "text": "You hook up your translator device. The signal is a message: \"Travelers, we are the Lumari. If you come in peace, follow the frequency north. If you seek only to leave, adjust to 7.2 MHz for launch coordinates.\" You have a choice to make.",
      "choices": [
        { "label": "Follow the frequency north to meet the Lumari", "next": "meet_aliens" },
        { "label": "Tune to 7.2 MHz for launch coordinates", "next": "ending_escape" }
      ]
    },
    "deep_cave": {
      "text": "The star map leads you to a hidden underground chamber where an old crashed spaceship sits covered in vines. Its pilot left a log: \"The crystals power everything here. Place one in your engine and you can fly home.\" But you also see a sealed door with alien writing on it.",
      "choices": [
        { "label": "Take a crystal to your ship''s engine", "next": "crystal_power" },
        { "label": "Try to open the sealed door", "next": "meet_aliens" }
      ]
    },
    "meet_aliens": {
      "text": "You enter a vast underground city filled with gentle, glowing beings -- the Lumari. Their leader steps forward. \"We have waited long for a visitor brave enough to find us. We can repair your ship, but we ask one thing: share knowledge of your world with us.\"",
      "choices": [
        { "label": "Agree and share stories of Earth", "next": "ending_alliance" },
        { "label": "Politely decline and ask for directions home instead", "next": "ending_escape" }
      ]
    },
    "crystal_power": {
      "text": "You carefully place the glowing crystal into your ship''s engine. It hums to life with more power than ever before! Your navigation system reboots and charts a course home. But the crystal also picks up a faint distress signal from somewhere on the planet.",
      "choices": [
        { "label": "Investigate the distress signal before leaving", "next": "ending_hero" },
        { "label": "Launch now while the engine is strong", "next": "ending_escape" }
      ]
    },
    "ending_alliance": {
      "text": "You spend days sharing stories, music, and science with the Lumari. In return, they upgrade your ship with crystal-powered engines and give you a communication device so you can always stay in touch. You blast off toward Earth, knowing you have friends among the stars. The end!",
      "choices": []
    },
    "ending_escape": {
      "text": "Your ship roars back to life and you launch through the purple clouds into open space. The mysterious planet shrinks behind you as you set course for Earth. You made it home safely, but you can not help wondering what secrets that planet still holds. The end!",
      "choices": []
    },
    "ending_hero": {
      "text": "You follow the distress signal to a crashed Lumari scout ship. The pilot is injured but alive. You use your first-aid kit to help, and soon the Lumari rescue team arrives. Grateful beyond words, they repair your ship and name a star after you. You head home as a true space hero. The end!",
      "choices": []
    }
  }'::jsonb
);
