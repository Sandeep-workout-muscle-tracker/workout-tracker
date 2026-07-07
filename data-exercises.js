// Exercise database. Each exercise targets one primary sub-muscle, optionally secondary ones.
// equip values: barbell, dumbbell, cable, machine, bodyweight, kettlebell, band, smith, plate

const MUSCLE_GROUPS = {
  chest:     { label: "Chest",     subs: ["chest_upper", "chest_mid", "chest_lower"] },
  back:      { label: "Back",      subs: ["lats", "traps", "rhomboids", "lower_back"] },
  shoulders: { label: "Shoulders", subs: ["delts_front", "delts_side", "delts_rear"] },
  arms:      { label: "Arms",      subs: ["biceps", "triceps", "forearms"] },
  legs:      { label: "Legs",      subs: ["quads", "hamstrings", "glutes", "calves", "adductors"] },
  core:      { label: "Core",      subs: ["abs_upper", "abs_lower", "obliques"] },
};

const SUBMUSCLE_LABELS = {
  chest_upper: "Upper Chest", chest_mid: "Mid Chest", chest_lower: "Lower Chest",
  lats: "Lats", traps: "Traps", rhomboids: "Rhomboids / Mid-Back", lower_back: "Lower Back / Erectors",
  delts_front: "Front Delts", delts_side: "Side Delts", delts_rear: "Rear Delts",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  quads: "Quadriceps", hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves", adductors: "Inner / Outer Thigh",
  abs_upper: "Upper Abs", abs_lower: "Lower Abs", obliques: "Obliques",
};

const EQUIP_LABELS = {
  barbell: "Barbell", dumbbell: "Dumbbell", cable: "Cable", machine: "Machine",
  bodyweight: "Bodyweight", kettlebell: "Kettlebell", band: "Band", smith: "Smith Machine", plate: "Plate",
};

function ex(id, name, sub, equip, note, secondary) {
  return { id, name, sub, equip, note, secondary: secondary || [] };
}

const SEED_EXERCISES = [
  // ---- CHEST: UPPER ----
  ex("inc_bb_press", "Incline Barbell Bench Press", "chest_upper", "barbell", "Bench set 30-45°. Bar to upper chest, press up and slightly back.", ["delts_front", "triceps"]),
  ex("inc_db_press", "Incline Dumbbell Press", "chest_upper", "dumbbell", "Incline bench, press dumbbells up and in until they nearly touch.", ["delts_front", "triceps"]),
  ex("inc_db_fly", "Incline Dumbbell Fly", "chest_upper", "dumbbell", "Wide arc from chest height, slight elbow bend, squeeze at top.", []),
  ex("low_high_cable_fly", "Low-to-High Cable Fly", "chest_upper", "cable", "Pulleys low, sweep hands up and together at shoulder height.", []),
  ex("inc_machine_press", "Incline Machine Chest Press", "chest_upper", "machine", "Seat set so handles align with upper chest, press forward.", ["delts_front", "triceps"]),
  ex("inc_pushup", "Incline Push-Up (feet elevated)", "chest_upper", "bodyweight", "Feet on a bench, hands on floor, lower chest toward hands.", ["delts_front", "triceps"]),
  ex("smith_inc_press", "Smith Machine Incline Press", "chest_upper", "smith", "Incline bench under the bar, press through a fixed vertical path.", ["delts_front", "triceps"]),
  ex("inc_cable_press", "Incline Cable Press", "chest_upper", "cable", "Pulleys set low, press up and forward from an incline bench.", ["delts_front", "triceps"]),

  // ---- CHEST: MID ----
  ex("flat_bb_press", "Flat Barbell Bench Press", "chest_mid", "barbell", "Grip just outside shoulders, lower to mid-chest, press up.", ["delts_front", "triceps"]),
  ex("flat_db_press", "Flat Dumbbell Press", "chest_mid", "dumbbell", "Flat bench, press dumbbells up over the chest, control the descent.", ["delts_front", "triceps"]),
  ex("flat_db_fly", "Flat Dumbbell Fly", "chest_mid", "dumbbell", "Slight elbow bend, lower in an arc, squeeze chest to bring back up.", []),
  ex("mid_cable_fly", "Mid Cable Fly / Crossover", "chest_mid", "cable", "Pulleys at chest height, bring handles together in front of chest.", []),
  ex("flat_machine_press", "Flat Machine Chest Press", "chest_mid", "machine", "Handles level with mid chest, press straight out.", ["delts_front", "triceps"]),
  ex("pushup", "Push-Up", "chest_mid", "bodyweight", "Hands shoulder-width, body straight, lower chest to floor.", ["delts_front", "triceps"]),
  ex("pec_deck", "Pec Deck / Butterfly Machine", "chest_mid", "machine", "Elbows at chest height, bring pads together in front.", []),
  ex("smith_flat_press", "Smith Machine Flat Bench Press", "chest_mid", "smith", "Flat bench under the bar, press through the fixed track.", ["delts_front", "triceps"]),
  ex("dips_chest", "Chest Dips (torso leaned forward)", "chest_mid", "bodyweight", "Lean forward, lower until a stretch is felt in the chest, press up.", ["triceps", "delts_front"]),

  // ---- CHEST: LOWER ----
  ex("dec_bb_press", "Decline Barbell Bench Press", "chest_lower", "barbell", "Decline bench, bar to lower chest, press up and back.", ["triceps"]),
  ex("dec_db_press", "Decline Dumbbell Press", "chest_lower", "dumbbell", "Decline bench, press dumbbells up from lower chest.", ["triceps"]),
  ex("high_low_cable_fly", "High-to-Low Cable Fly", "chest_lower", "cable", "Pulleys high, sweep hands down and together toward hips.", []),
  ex("dec_pushup", "Decline Push-Up (hands elevated)", "chest_lower", "bodyweight", "Hands on a bench or box, feet on floor, lower chest toward hands.", ["triceps"]),
  ex("dips_lower_chest", "Dips (lower chest focus)", "chest_lower", "bodyweight", "Torso leaned forward, focus the stretch through the lower chest.", ["triceps"]),
  ex("dec_machine_press", "Decline Machine Press", "chest_lower", "machine", "Seat lowered so handles sit below chest, press forward and down.", ["triceps"]),
  ex("svend_press", "Svend Press", "chest_lower", "plate", "Squeeze a plate between both palms, press straight out at chest height.", []),

  // ---- BACK: LATS ----
  ex("deadlift", "Deadlift", "lats", "barbell", "Hips back, flat spine, drive through the floor to stand tall.", ["lower_back", "glutes", "hamstrings", "traps"]),
  ex("pullup", "Pull-Up", "lats", "bodyweight", "Overhand grip, pull chin above the bar, control the descent.", ["biceps", "rhomboids"]),
  ex("lat_pulldown", "Lat Pulldown", "lats", "cable", "Wide grip, pull the bar to upper chest, squeeze shoulder blades down.", ["biceps", "rhomboids"]),
  ex("seated_cable_row", "Seated Cable Row", "lats", "cable", "Row handle to the stomach, pull shoulder blades back, avoid leaning.", ["rhomboids", "biceps"]),
  ex("bo_row", "Barbell Bent-Over Row", "lats", "barbell", "Hinge forward, pull bar to lower ribs, keep back flat.", ["rhomboids", "lower_back"]),
  ex("one_arm_db_row", "One-Arm Dumbbell Row", "lats", "dumbbell", "Support on a bench, pull dumbbell to hip, squeeze at the top.", ["rhomboids", "biceps"]),
  ex("tbar_row", "T-Bar Row", "lats", "machine", "Chest-supported or standing, pull the bar to the torso.", ["rhomboids"]),
  ex("straight_arm_pulldown", "Straight-Arm Pulldown", "lats", "cable", "Arms straight, pull the bar down toward the thighs.", []),
  ex("chinup", "Chin-Up", "lats", "bodyweight", "Underhand grip, pull chin above the bar.", ["biceps"]),
  ex("machine_row", "Machine Row", "lats", "machine", "Chest supported, pull handles toward the torso.", ["rhomboids", "biceps"]),

  // ---- BACK: TRAPS ----
  ex("bb_shrug", "Barbell Shrug", "traps", "barbell", "Hold bar at hips, shrug shoulders straight up, no rolling.", []),
  ex("db_shrug", "Dumbbell Shrug", "traps", "dumbbell", "Dumbbells at sides, shrug shoulders straight up.", []),
  ex("cable_shrug", "Cable Shrug", "traps", "cable", "Straight bar attachment, shrug against constant cable tension.", []),
  ex("smith_shrug", "Smith Machine Shrug", "traps", "smith", "Bar at hips, shrug straight up along the fixed path.", []),
  ex("farmers_carry", "Farmer's Carry", "traps", "dumbbell", "Heavy dumbbells at sides, walk with tall posture and braced core.", ["forearms"]),
  ex("upright_row", "Upright Row", "traps", "barbell", "Pull bar up close to the body to chest height, elbows lead.", ["delts_side"]),
  ex("face_pull_traps", "Cable Face Pull", "traps", "cable", "Rope to eye level, pull apart toward the ears.", ["delts_rear", "rhomboids"]),

  // ---- BACK: RHOMBOIDS / MID-BACK ----
  ex("mid_seated_row", "Seated Cable Row (mid-back focus)", "rhomboids", "cable", "Pause and squeeze shoulder blades together at the end of each row.", ["lats"]),
  ex("chest_sup_row", "Chest-Supported Dumbbell Row", "rhomboids", "dumbbell", "Chest on an incline bench, row dumbbells up to the sides.", ["lats", "delts_rear"]),
  ex("reverse_pec_deck", "Reverse Pec Deck", "rhomboids", "machine", "Face the pad, sweep arms back and squeeze shoulder blades.", ["delts_rear"]),
  ex("band_pull_apart", "Band Pull-Apart", "rhomboids", "band", "Arms straight, pull the band apart at chest height.", ["delts_rear"]),
  ex("cable_face_pull_mid", "Cable Face Pull", "rhomboids", "cable", "Pull rope toward the face, elbows high, squeeze mid-back.", ["delts_rear", "traps"]),
  ex("machine_row_mid", "Machine Row (mid-back focus)", "rhomboids", "machine", "Pull with elbows wide, pause and squeeze at the back.", ["lats"]),

  // ---- BACK: LOWER BACK / ERECTORS ----
  ex("rdl", "Romanian Deadlift", "lower_back", "barbell", "Soft knees, hinge hips back, bar close to legs, feel a hamstring stretch.", ["hamstrings", "glutes"]),
  ex("good_morning", "Good Morning", "lower_back", "barbell", "Bar on back, hinge forward keeping a flat back, return to standing.", ["hamstrings"]),
  ex("hyperextension", "Hyperextension / Back Extension", "lower_back", "machine", "Hips on the pad, lower torso then raise to a straight line.", ["glutes"]),
  ex("kb_swing", "Kettlebell Swing", "lower_back", "kettlebell", "Hip hinge drives the kettlebell to shoulder height with a snap of the hips.", ["glutes", "hamstrings"]),
  ex("cable_pull_through", "Cable Pull-Through", "lower_back", "cable", "Cable between the legs, hinge forward then drive hips through.", ["glutes", "hamstrings"]),
  ex("superman", "Superman", "lower_back", "bodyweight", "Lying face down, lift arms and legs off the floor together, hold.", ["glutes"]),

  // ---- SHOULDERS: FRONT DELTS ----
  ex("bb_ohp", "Barbell Overhead Press", "delts_front", "barbell", "Bar from the front rack, press straight overhead.", ["triceps", "delts_side"]),
  ex("db_ohp", "Dumbbell Overhead Press", "delts_front", "dumbbell", "Dumbbells at shoulder height, press up until arms are straight.", ["triceps", "delts_side"]),
  ex("db_front_raise", "Dumbbell Front Raise", "delts_front", "dumbbell", "Raise dumbbells to shoulder height in front of the body.", []),
  ex("cable_front_raise", "Cable Front Raise", "delts_front", "cable", "Low pulley, raise the handle straight in front to shoulder height.", []),
  ex("machine_shoulder_press", "Machine Shoulder Press", "delts_front", "machine", "Handles at shoulder height, press straight up.", ["triceps"]),
  ex("smith_ohp", "Smith Machine Overhead Press", "delts_front", "smith", "Bar starts at shoulder height, press straight up along the fixed path.", ["triceps"]),
  ex("plate_front_raise", "Plate Front Raise", "delts_front", "plate", "Hold a plate with both hands, raise to eye level.", []),
  ex("arnold_press", "Arnold Press", "delts_front", "dumbbell", "Start palms facing you, press up while rotating palms forward.", ["delts_side", "triceps"]),

  // ---- SHOULDERS: SIDE DELTS ----
  ex("db_lat_raise", "Dumbbell Lateral Raise", "delts_side", "dumbbell", "Raise dumbbells out to the sides to shoulder height.", []),
  ex("cable_lat_raise", "Cable Lateral Raise", "delts_side", "cable", "Low pulley to the side, raise the handle out to shoulder height.", []),
  ex("machine_lat_raise", "Machine Lateral Raise", "delts_side", "machine", "Elbows on the pads, raise out to the sides.", []),
  ex("leaning_cable_raise", "Leaning Cable Lateral Raise", "delts_side", "cable", "Lean away from a low pulley, raise the arm out to the side.", []),
  ex("wide_upright_row", "Wide-Grip Upright Row", "delts_side", "barbell", "Wide grip, pull the bar up toward chin height.", ["traps"]),
  ex("band_lat_raise", "Band Lateral Raise", "delts_side", "band", "Band underfoot, raise the arm out to the side against tension.", []),

  // ---- SHOULDERS: REAR DELTS ----
  ex("reverse_pec_deck_rd", "Reverse Pec Deck", "delts_rear", "machine", "Face the pad, sweep arms back and out.", ["rhomboids"]),
  ex("bent_db_reverse_fly", "Bent-Over Dumbbell Reverse Fly", "delts_rear", "dumbbell", "Hinge forward, raise dumbbells out to the sides.", ["rhomboids"]),
  ex("cable_face_pull_rd", "Cable Face Pull", "delts_rear", "cable", "Rope to eye level, pull apart toward the ears.", ["traps", "rhomboids"]),
  ex("cable_reverse_fly", "Cable Reverse Fly", "delts_rear", "cable", "Cross-body cables, sweep arms out and back.", ["rhomboids"]),
  ex("band_pull_apart_rd", "Band Pull-Apart", "delts_rear", "band", "Arms straight, pull the band apart at shoulder height.", ["rhomboids"]),
  ex("bent_cable_reverse_fly", "Bent-Over Cable Reverse Fly", "delts_rear", "cable", "Hinge forward, cross-body cables swept out to the sides.", []),

  // ---- ARMS: BICEPS ----
  ex("bb_curl", "Barbell Curl", "biceps", "barbell", "Elbows pinned to sides, curl the bar up, control the lowering.", []),
  ex("ez_curl", "EZ-Bar Curl", "biceps", "barbell", "Angled grip on an EZ bar, curl up keeping elbows still.", []),
  ex("db_curl", "Dumbbell Curl", "biceps", "dumbbell", "Curl dumbbells up, rotating palms up through the movement.", []),
  ex("hammer_curl", "Hammer Curl", "biceps", "dumbbell", "Neutral grip, curl straight up without rotating the wrist.", ["forearms"]),
  ex("cable_curl", "Cable Curl", "biceps", "cable", "Straight bar low pulley, curl up keeping elbows fixed.", []),
  ex("concentration_curl", "Concentration Curl", "biceps", "dumbbell", "Elbow braced against the inner thigh, curl straight up.", []),
  ex("preacher_curl", "Preacher Curl", "biceps", "barbell", "Arms on the preacher pad, curl up without letting elbows lift.", []),
  ex("inc_db_curl", "Incline Dumbbell Curl", "biceps", "dumbbell", "Sit back on an incline bench, curl with arms fully extended behind the body.", []),
  ex("machine_curl", "Machine Bicep Curl", "biceps", "machine", "Elbows on the pad, curl through the fixed arc.", []),
  ex("chinup_biceps", "Chin-Up (biceps focus)", "biceps", "bodyweight", "Underhand grip, focus on pulling with the arms.", ["lats"]),

  // ---- ARMS: TRICEPS ----
  ex("cable_pushdown", "Cable Push-Down", "triceps", "cable", "Elbows pinned at sides, push the bar down to full extension.", []),
  ex("oh_cable_ext", "Overhead Cable Triceps Extension", "triceps", "cable", "Rope overhead, extend arms forward and down.", []),
  ex("db_oh_ext", "Dumbbell Overhead Extension", "triceps", "dumbbell", "One or two hands, lower a dumbbell behind the head, extend up.", []),
  ex("skull_crusher", "Skull Crusher / Lying Triceps Extension", "triceps", "barbell", "Lying down, lower the bar toward the forehead, extend back up.", []),
  ex("close_grip_bench", "Close-Grip Bench Press", "triceps", "barbell", "Hands shoulder-width or closer, press keeping elbows tucked.", ["chest_mid"]),
  ex("dips_triceps", "Dips (triceps focus)", "triceps", "bodyweight", "Torso upright, lower and press back up focusing on the arms.", ["chest_lower"]),
  ex("db_kickback", "One-Arm Dumbbell Kickback", "triceps", "dumbbell", "Hinge forward, extend the arm straight back.", []),
  ex("machine_triceps_ext", "Machine Triceps Extension", "triceps", "machine", "Elbows fixed at the pivot, press the handle down.", []),
  ex("bench_dip", "Bench Dip", "triceps", "bodyweight", "Hands on a bench behind you, lower hips and press back up.", []),

  // ---- ARMS: FOREARMS ----
  ex("wrist_curl", "Wrist Curl", "forearms", "barbell", "Forearms on a bench, curl the wrist up through its full range.", []),
  ex("reverse_wrist_curl", "Reverse Wrist Curl", "forearms", "barbell", "Forearms on a bench, palms down, extend the wrist upward.", []),
  ex("farmers_carry_fa", "Farmer's Carry", "forearms", "dumbbell", "Heavy dumbbells at sides, walk while gripping hard.", ["traps"]),
  ex("reverse_curl", "Reverse Curl", "forearms", "barbell", "Overhand grip, curl the bar up keeping wrists firm.", ["biceps"]),
  ex("plate_pinch", "Plate Pinch Hold", "forearms", "plate", "Pinch two plates together and hold for time.", []),
  ex("cable_wrist_curl", "Cable Wrist Curl", "forearms", "cable", "Low pulley, curl the wrist up against cable tension.", []),

  // ---- LEGS: QUADS ----
  ex("bb_squat", "Barbell Back Squat", "quads", "barbell", "Bar on upper back, squat down to depth, drive up through the heels.", ["glutes", "hamstrings"]),
  ex("front_squat", "Front Squat", "quads", "barbell", "Bar in the front rack, sit down keeping the torso upright.", ["glutes"]),
  ex("leg_press", "Leg Press", "quads", "machine", "Feet shoulder-width on the platform, press away from the body.", ["glutes", "hamstrings"]),
  ex("leg_extension", "Leg Extension", "quads", "machine", "Shins under the pad, extend the legs straight out.", []),
  ex("walking_lunge", "Walking Lunge", "quads", "dumbbell", "Step forward into a lunge, alternate legs while walking.", ["glutes"]),
  ex("bulgarian_split_squat", "Bulgarian Split Squat", "quads", "dumbbell", "Rear foot elevated, lower the front leg into a lunge.", ["glutes"]),
  ex("smith_squat", "Smith Machine Squat", "quads", "smith", "Bar on the back, squat along the fixed vertical path.", ["glutes"]),
  ex("goblet_squat", "Goblet Squat", "quads", "kettlebell", "Hold a kettlebell at the chest, squat down between the knees.", ["glutes"]),
  ex("hack_squat", "Hack Squat", "quads", "machine", "Back against the pad, squat down along the fixed track.", ["glutes"]),

  // ---- LEGS: HAMSTRINGS ----
  ex("rdl_ham", "Romanian Deadlift", "hamstrings", "barbell", "Hinge at the hips with soft knees, feel the hamstring stretch.", ["glutes", "lower_back"]),
  ex("lying_leg_curl", "Lying Leg Curl", "hamstrings", "machine", "Face down, curl the pad up toward the glutes.", []),
  ex("seated_leg_curl", "Seated Leg Curl", "hamstrings", "machine", "Seated, curl the pad down and back.", []),
  ex("good_morning_ham", "Good Morning", "hamstrings", "barbell", "Bar on back, hinge forward keeping the back flat.", ["lower_back"]),
  ex("nordic_curl", "Nordic Hamstring Curl", "hamstrings", "bodyweight", "Ankles anchored, lower the torso forward under control.", []),
  ex("kb_swing_ham", "Kettlebell Swing", "hamstrings", "kettlebell", "Hip hinge snaps the kettlebell up to shoulder height.", ["glutes", "lower_back"]),
  ex("stiff_leg_db_dl", "Stiff-Leg Dumbbell Deadlift", "hamstrings", "dumbbell", "Legs nearly straight, hinge and lower dumbbells along the shins.", ["glutes"]),

  // ---- LEGS: GLUTES ----
  ex("hip_thrust", "Barbell Hip Thrust", "glutes", "barbell", "Upper back on a bench, bar over hips, drive hips up.", ["hamstrings"]),
  ex("glute_bridge", "Glute Bridge", "glutes", "bodyweight", "Lying down, drive hips up squeezing the glutes at the top.", []),
  ex("cable_kickback", "Cable Kickback", "glutes", "cable", "Ankle cuff attachment, kick the leg straight back.", []),
  ex("bulgarian_split_squat_g", "Bulgarian Split Squat", "glutes", "dumbbell", "Rear foot elevated, drive through the front heel.", ["quads"]),
  ex("sumo_deadlift", "Sumo Deadlift", "glutes", "barbell", "Wide stance, grip inside the legs, drive the floor away.", ["quads", "hamstrings"]),
  ex("machine_kickback", "Machine Glute Kickback", "glutes", "machine", "Foot on the pad, press back and up.", []),
  ex("step_up", "Step-Up", "glutes", "dumbbell", "Step onto a box, drive through the lead leg to stand tall.", ["quads"]),

  // ---- LEGS: CALVES ----
  ex("standing_calf_raise", "Standing Calf Raise", "calves", "machine", "Balls of feet on the platform, rise up onto the toes.", []),
  ex("seated_calf_raise", "Seated Calf Raise", "calves", "machine", "Knees under the pad, rise up onto the toes.", []),
  ex("db_calf_raise", "Dumbbell Calf Raise", "calves", "dumbbell", "Dumbbells at sides, rise up onto the toes off a step.", []),
  ex("smith_calf_raise", "Smith Machine Calf Raise", "calves", "smith", "Balls of feet on a block, rise up under the bar.", []),
  ex("leg_press_calf_raise", "Leg Press Calf Raise", "calves", "machine", "Press through the balls of the feet on the leg press platform.", []),
  ex("bw_calf_raise", "Bodyweight Calf Raise", "calves", "bodyweight", "Rise up onto the toes off a step, lower under control.", []),

  // ---- LEGS: ADDUCTORS / ABDUCTORS ----
  ex("cable_hip_adduction", "Cable Hip Adduction", "adductors", "cable", "Ankle cuff, pull the leg across the body.", []),
  ex("cable_hip_abduction", "Cable Hip Abduction", "adductors", "cable", "Ankle cuff, push the leg out and away from the body.", []),
  ex("machine_adductor", "Machine Hip Adductor", "adductors", "machine", "Knees on the pads, squeeze legs together.", []),
  ex("machine_abductor", "Machine Hip Abductor", "adductors", "machine", "Knees on the pads, push legs apart.", []),
  ex("sumo_squat", "Sumo Squat", "adductors", "dumbbell", "Wide stance, toes out, squat down holding a dumbbell.", ["glutes", "quads"]),
  ex("side_lunge", "Side Lunge", "adductors", "dumbbell", "Step out wide, sit back into one hip, other leg stays straight.", ["quads", "glutes"]),
  ex("band_lateral_walk", "Band Lateral Walk", "adductors", "band", "Band around the ankles, step sideways keeping tension on.", ["glutes"]),

  // ---- CORE: UPPER ABS ----
  ex("crunch", "Crunch", "abs_upper", "bodyweight", "Lift shoulder blades off the floor, curl toward the knees.", []),
  ex("cable_crunch", "Cable Crunch", "abs_upper", "cable", "Kneel below a rope pulley, curl the torso down toward the knees.", []),
  ex("machine_ab_crunch", "Machine Abdominal Crunch", "abs_upper", "machine", "Chest against the pad, curl the torso forward.", []),
  ex("situp", "Sit-Up", "abs_upper", "bodyweight", "Feet anchored, curl the whole torso up to the knees.", ["abs_lower"]),
  ex("decline_crunch", "Decline Crunch", "abs_upper", "bodyweight", "On a decline bench, curl the torso up.", []),
  ex("weighted_crunch", "Weighted Crunch", "abs_upper", "plate", "Hold a plate at the chest, crunch up through the trunk.", []),

  // ---- CORE: LOWER ABS ----
  ex("hanging_leg_raise", "Hanging Leg Raise", "abs_lower", "bodyweight", "Hang from a bar, raise straight legs to hip height or above.", []),
  ex("lying_leg_raise", "Lying Leg Raise", "abs_lower", "bodyweight", "Lying down, raise straight legs toward the ceiling.", []),
  ex("captains_chair", "Captain's Chair Knee Raise", "abs_lower", "machine", "Supported on the arms, raise the knees toward the chest.", []),
  ex("reverse_crunch", "Reverse Crunch", "abs_lower", "bodyweight", "Curl the hips up off the floor, knees toward the chest.", []),
  ex("flutter_kicks", "Flutter Kicks", "abs_lower", "bodyweight", "Lying down, small alternating kicks with straight legs.", []),

  // ---- CORE: OBLIQUES ----
  ex("cable_woodchopper", "Cable Woodchopper", "obliques", "cable", "Rotate the torso, pulling the cable diagonally across the body.", []),
  ex("russian_twist", "Russian Twist", "obliques", "plate", "Seated, lean back slightly, rotate a plate side to side.", []),
  ex("side_plank", "Side Plank", "obliques", "bodyweight", "Support on one forearm, hold the body in a straight line.", []),
  ex("hanging_oblique_raise", "Hanging Oblique Raise", "obliques", "bodyweight", "Hang from a bar, raise the knees up and to one side.", []),
  ex("db_side_bend", "Dumbbell Side Bend", "obliques", "dumbbell", "Dumbbell in one hand, bend directly sideways and back up.", []),
  ex("landmine_rotation", "Landmine Rotation", "obliques", "barbell", "One end of a bar anchored, rotate it side to side at arm's length.", []),
];

// Convenience lookup — populated dynamically via library.js so user overrides are respected.
// See getExercises() / getExercisesBySub() in library.js. Also expose EXERCISES + EXERCISES_BY_SUB
// as live getters for backwards compatibility with existing callers.
Object.defineProperty(globalThis, "EXERCISES", { get() { return getExercises(); } });
Object.defineProperty(globalThis, "EXERCISES_BY_SUB", { get() { return getExercisesBySub(); } });
