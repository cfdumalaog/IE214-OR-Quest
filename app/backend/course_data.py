"""
course_data.py - Master course metadata, lecture mappings, slide matches,
gamification definitions, quizzes, minigames, and ADHD 5-10 minute bite-sized focus sprints.
"""

import os
import json

CUSTOM_MARKERS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "custom_slide_markers.json")
USER_NOTES_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "user_exam_notes.json")

def load_custom_markers():
    if os.path.exists(CUSTOM_MARKERS_FILE):
        try:
            with open(CUSTOM_MARKERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_custom_marker(module_id: str, slide_deck: str, slide_page: int, time_sec: int):
    data = load_custom_markers()
    mod_data = data.setdefault(module_id, [])
    existing = next((m for m in mod_data if m["slide"] == slide_page and m.get("deck", slide_deck) == slide_deck), None)
    if existing:
        existing["time_sec"] = time_sec
    else:
        mod_data.append({"deck": slide_deck, "slide": slide_page, "time_sec": time_sec, "title": f"Slide {slide_page}"})
    mod_data.sort(key=lambda x: x["time_sec"])
    os.makedirs(os.path.dirname(CUSTOM_MARKERS_FILE), exist_ok=True)
    with open(CUSTOM_MARKERS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_user_notes():
    if os.path.exists(USER_NOTES_FILE):
        try:
            with open(USER_NOTES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_user_note(note: dict):
    import time
    notes = load_user_notes()
    if not note.get("id"):
        note["id"] = f"un_{int(time.time()*1000)}"
    if not note.get("created_at"):
        note["created_at"] = time.strftime("%b %d, %Y %I:%M %p")
    # Replace if exists, else prepend
    existing_idx = next((i for i, n in enumerate(notes) if n.get("id") == note["id"]), None)
    if existing_idx is not None:
        notes[existing_idx] = note
    else:
        notes.insert(0, note)
    os.makedirs(os.path.dirname(USER_NOTES_FILE), exist_ok=True)
    with open(USER_NOTES_FILE, "w", encoding="utf-8") as f:
        json.dump(notes, f, indent=2)
    return note

def delete_user_note(note_id: str):
    notes = load_user_notes()
    notes = [n for n in notes if n.get("id") != note_id]
    os.makedirs(os.path.dirname(USER_NOTES_FILE), exist_ok=True)
    with open(USER_NOTES_FILE, "w", encoding="utf-8") as f:
        json.dump(notes, f, indent=2)
    return True

SESSION_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "session_state.json")

DEFAULT_SESSION = {
    "last_module_id": "module_aug10",
    "last_tab": "theater",
    "last_side_tab": "slides",
    "playback_speed": 1.0,
    "subtitles_enabled": True,
    "subtitle_size": "md",
    "subtitle_contrast": "amber",
    "lecture_positions": {},
    "lecture_streams": {},
    "lecture_slides": {},
    "completed_sprints": [],
    "updated_at": None
}

def load_session_state() -> dict:
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                merged = dict(DEFAULT_SESSION)
                merged.update(data)
                return merged
        except Exception:
            pass
    return dict(DEFAULT_SESSION)

def save_session_state(session_data: dict) -> dict:
    import time
    current = load_session_state()
    for k, v in session_data.items():
        if isinstance(v, dict) and isinstance(current.get(k), dict):
            current[k].update(v)
        elif isinstance(v, list) and isinstance(current.get(k), list):
            # Union of items preserving order
            merged_list = list(current[k])
            for item in v:
                if item not in merged_list:
                    merged_list.append(item)
            current[k] = merged_list
        else:
            current[k] = v
    current["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    os.makedirs(os.path.dirname(SESSION_FILE), exist_ok=True)
    with open(SESSION_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    return current

MODULES_DATA = [
    {
        "id": "module_aug10",
        "folder": "August 10",
        "date": "August 10, 2026",
        "title": "Operations Research Foundations & Methodology",
        "subtitle": "Introduction to IE/OR, Management Functions, Goods vs Services, Analytics vs OR",
        "syllabus_week": "Week 1",
        "syllabus_topic": "Introduction to Operations Research, OR Methodology",
        "default_video": "GMT20260810-112202_Recording_gallery_1920x1128.mp4",
        "default_slide_deck": "Set 1 Slides rev 1",
        "duration_minutes": 74.9,
        "xp_reward": 250,
        "description": "Professor Lowell Lorenzo introduces the core philosophy of Industrial Engineering and Operations Research at UP Diliman. Covers the transformation of inputs into goods and services, 5 management functions, INFORMS Analytics definition, the 5-step OR Methodology, and transitions to Set 2 on Linear Programming.",
        "sprints": [
            {
                "id": "aug10_s1",
                "number": 1,
                "title": "Welcome & Course Orientation",
                "start_sec": 0,
                "end_sec": 510,
                "duration_min": 8.5,
                "objective": "Understand IE 214 grading structure, remote learning policies, and course expectations.",
                "slide_deck": "Set 1 Slides rev 1",
                "slide_page": 1
            },
            {
                "id": "aug10_s2",
                "number": 2,
                "title": "Industrial Systems: Goods vs Services",
                "start_sec": 510,
                "end_sec": 990,
                "duration_min": 8.0,
                "objective": "Differentiate between tangible physical goods and intangible services.",
                "slide_deck": "Set 1 Slides rev 1",
                "slide_page": 1
            },
            {
                "id": "aug10_s3",
                "number": 3,
                "title": "The 5 Management Functions",
                "start_sec": 990,
                "end_sec": 1500,
                "duration_min": 8.5,
                "objective": "Analyze Planning, Organizing, Staffing, Directing, and Controlling in industrial systems.",
                "slide_deck": "Set 1 Slides rev 1",
                "slide_page": 2
            },
            {
                "id": "aug10_s4",
                "number": 4,
                "title": "Operations Research Defined",
                "start_sec": 1500,
                "end_sec": 2040,
                "duration_min": 9.0,
                "objective": "Examine historical military roots and classic definitions (Morse & Kimball, Churchman Ackoff).",
                "slide_deck": "Set 1 Slides rev 1",
                "slide_page": 3
            },
            {
                "id": "aug10_s5",
                "number": 5,
                "title": "Analytics vs Operations Research",
                "start_sec": 2040,
                "end_sec": 2610,
                "duration_min": 9.5,
                "objective": "Distinguish Descriptive, Predictive, and Prescriptive (Normative Optimization) analytics.",
                "slide_deck": "Set 1 Slides rev 1",
                "slide_page": 4
            },
            {
                "id": "aug10_s6",
                "number": 6,
                "title": "The 5-Step OR Methodology",
                "start_sec": 2610,
                "end_sec": 3120,
                "duration_min": 8.5,
                "objective": "Master the methodology: Problem formulation, Model construction, Deriving solutions, Validation, and Implementation.",
                "slide_deck": "Set 1 Slides rev 1",
                "slide_page": 6
            },
            {
                "id": "aug10_s7",
                "number": 7,
                "title": "Introduction to Linear Programming & Nobel Breakthrough",
                "start_sec": 3120,
                "end_sec": 3720,
                "duration_min": 10.0,
                "objective": "Learn why Kantorovich and Koopmans won the 1975 Nobel Prize in Economic Sciences.",
                "slide_deck": "Set 2 Slides",
                "slide_page": 1
            },
            {
                "id": "aug10_s8",
                "number": 8,
                "title": "Anatomy of LP: Variables & Constraints",
                "start_sec": 3720,
                "end_sec": 4494,
                "duration_min": 12.9,
                "objective": "Understand decision variables x_j, technological coefficients a_ij, and non-negativity.",
                "slide_deck": "Set 2 Slides",
                "slide_page": 3
            }
        ],
        "slide_markers": [
            {"time_sec": 0, "deck": "Set 1 Slides rev 1", "slide": 1, "title": "IE Definition & Resource Integration"},
            {"time_sec": 510, "deck": "Set 1 Slides rev 1", "slide": 1, "title": "Goods vs Services Discussion"},
            {"time_sec": 990, "deck": "Set 1 Slides rev 1", "slide": 2, "title": "Management Functions in Organizations"},
            {"time_sec": 1500, "deck": "Set 1 Slides rev 1", "slide": 3, "title": "Operations Research Defined"},
            {"time_sec": 2040, "deck": "Set 1 Slides rev 1", "slide": 4, "title": "Analytics Defined (INFORMS)"},
            {"time_sec": 2340, "deck": "Set 1 Slides rev 1", "slide": 5, "title": "Operations Research vs Analytics"},
            {"time_sec": 2610, "deck": "Set 1 Slides rev 1", "slide": 6, "title": "OR Methodology: Problem Definition"},
            {"time_sec": 2880, "deck": "Set 1 Slides rev 1", "slide": 11, "title": "OR Methodology: Implementation"},
            {"time_sec": 3120, "deck": "Set 2 Slides", "slide": 1, "title": "Linear Programming (LP) Overview"},
            {"time_sec": 3480, "deck": "Set 2 Slides", "slide": 2, "title": "Kantorovich & Koopmans (1975 Nobel)"},
            {"time_sec": 3720, "deck": "Set 2 Slides", "slide": 3, "title": "Structure of the LP Problem (Scalar)"}
        ],
        "key_concepts": [
            {"term": "Industrial Engineering", "def": "Integrates Information, Human, Money, Materials, Equipment, and Energy to produce goods and services efficiently and optimally."},
            {"term": "Goods vs Services", "def": "Goods are tangible physical products that can be inventoried and stored; Services are intangible benefits or performances."},
            {"term": "5 Management Functions", "def": "Planning (goals & strategies), Organizing (structure & tasks), Staffing (people), Directing (leading & motivating), Controlling (monitoring & correcting)."},
            {"term": "Operations Research (OR)", "def": "Application of scientific and mathematical methods to decision problems in systems to find optimal solutions."},
            {"term": "OR vs Analytics", "def": "Analytics spans Descriptive, Predictive, and Prescriptive. OR is fundamentally Prescriptive and Normative (optimizing)."}
        ],
        "quizzes": [
            {
                "id": "q_aug10_1",
                "question": "Which of the following is NOT one of the six fundamental resources integrated by Industrial Engineering according to Slide 1?",
                "options": ["Human Resources", "Materials", "Intellectual Property Exclusivity", "Energy"],
                "answer_idx": 2,
                "explanation": "IE integrates: Information, Human, Money, Materials, Equipment, and Energy to produce goods and services efficiently and optimally."
            },
            {
                "id": "q_aug10_2",
                "question": "What is the primary distinction between Goods and Services as discussed by Prof. Lorenzo?",
                "options": [
                    "Goods can only be sold in malls, while services are online only",
                    "Goods are tangible physical products that can be held and inventoried, whereas services are intangible activities",
                    "Services always cost more than goods",
                    "Industrial engineers only optimize goods production, never services"
                ],
                "answer_idx": 1,
                "explanation": "Goods are tangible (physical products you can hold, store, inventory), whereas services are intangible value-add activities or processes."
            },
            {
                "id": "q_aug10_3",
                "question": "In the spectrum of business analytics, which branch does Operations Research primarily embody?",
                "options": ["Descriptive Analytics", "Diagnostic Analytics", "Predictive Analytics", "Prescriptive Analytics"],
                "answer_idx": 3,
                "explanation": "OR provides normative, prescriptive solutions: determining the optimal decision policies to achieve the best possible objective."
            }
        ]
    },
    {
        "id": "module_aug17",
        "folder": "August 17",
        "date": "August 17, 2026",
        "title": "Linear Programming Foundations & Formulation",
        "subtitle": "Structure of LP, Scalar & Matrix Notations, Linear Algebra Review, Formulation Principles",
        "syllabus_week": "Week 2",
        "syllabus_topic": "Introduction to Linear Programming, LP Model Formulation",
        "default_video": "GMT20260817-100139_Recording_1920x1128.mp4",
        "default_slide_deck": "Set 2 Slides",
        "duration_minutes": 170.7,
        "xp_reward": 350,
        "description": "Deep dive into Linear Programming. Professor Lorenzo examines the historical breakthroughs of Leonid Kantorovich and Tjalling Koopmans (1975 Nobel Memorial Prize in Economic Sciences) and George Dantzig. Covers scalar form vs matrix form (c^T x s.t. Ax <= b, x >= 0), decision variable dimensionality, and practical formulation rules using the Coal Fired Plant and AMR Robot problem sets.",
        "sprints": [
            {"id": "aug17_s1", "number": 1, "title": "Recap & LP Fundamentals", "start_sec": 0, "end_sec": 570, "duration_min": 9.5, "objective": "Review the core optimization paradigm.", "slide_deck": "Set 2 Slides", "slide_page": 1},
            {"id": "aug17_s2", "number": 2, "title": "Nobel Pioneers: Kantorovich & Koopmans", "start_sec": 570, "end_sec": 1140, "duration_min": 9.5, "objective": "Historical significance of optimum resource allocation.", "slide_deck": "Set 2 Slides", "slide_page": 2},
            {"id": "aug17_s3", "number": 3, "title": "Scalar Notation: Decision Variables", "start_sec": 1140, "end_sec": 1710, "duration_min": 9.5, "objective": "Defining decision variables x_j rigorously.", "slide_deck": "Set 2 Slides", "slide_page": 3},
            {"id": "aug17_s4", "number": 4, "title": "The Objective Function Structure", "start_sec": 1710, "end_sec": 2280, "duration_min": 9.5, "objective": "Constructing linear objective functions Z = sum(c_j x_j).", "slide_deck": "Set 2 Slides", "slide_page": 3},
            {"id": "aug17_s5", "number": 5, "title": "Constraints & Technological Coefficients", "start_sec": 2280, "end_sec": 2850, "duration_min": 9.5, "objective": "Understanding coefficient matrix A and resource vector b.", "slide_deck": "Set 2 Slides", "slide_page": 3},
            {"id": "aug17_s6", "number": 6, "title": "Right-Hand Side Capacities & Non-Negativity", "start_sec": 2850, "end_sec": 3450, "duration_min": 10.0, "objective": "Why x_j >= 0 is fundamental to physical models.", "slide_deck": "Set 2 Slides", "slide_page": 3},
            {"id": "aug17_s7", "number": 7, "title": "Linear Algebra Refresh: Vectors & Spaces", "start_sec": 3450, "end_sec": 4050, "duration_min": 10.0, "objective": "Review column vectors and inner products.", "slide_deck": "Set 2 Slides", "slide_page": 4},
            {"id": "aug17_s8", "number": 8, "title": "Matrix Notation for LP", "start_sec": 4050, "end_sec": 4650, "duration_min": 10.0, "objective": "Writing LP as max c^T x s.t. Ax <= b, x >= 0.", "slide_deck": "Set 2 Slides", "slide_page": 5},
            {"id": "aug17_s9", "number": 9, "title": "Matrix Dimensions & Consistency", "start_sec": 4650, "end_sec": 5250, "duration_min": 10.0, "objective": "Checking m x n dimensions of A, n x 1 of c and x, m x 1 of b.", "slide_deck": "Set 2 Slides", "slide_page": 6},
            {"id": "aug17_s10", "number": 10, "title": "Translating Scalar Models to Matrix Equations", "start_sec": 5250, "end_sec": 5850, "duration_min": 10.0, "objective": "Step-by-step conversion techniques.", "slide_deck": "Set 2 Slides", "slide_page": 7},
            {"id": "aug17_s11", "number": 11, "title": "Support Worksheet Walkthrough", "start_sec": 5850, "end_sec": 6500, "duration_min": 10.8, "objective": "Concrete spreadsheet formulation examples.", "slide_deck": "Set 2 Slides", "slide_page": 8},
            {"id": "aug17_s12", "number": 12, "title": "Coal-Fired Plant: Problem Overview", "start_sec": 6500, "end_sec": 7150, "duration_min": 10.8, "objective": "Environmental and economic trade-offs in power generation.", "slide_deck": "Set 2 Slides", "slide_page": 9},
            {"id": "aug17_s13", "number": 13, "title": "Coal-Fired Plant: Variables & Objectives", "start_sec": 7150, "end_sec": 7800, "duration_min": 10.8, "objective": "Blending Grade A and Grade B coal.", "slide_deck": "Set 2 Slides", "slide_page": 10},
            {"id": "aug17_s14", "number": 14, "title": "Coal-Fired Plant: Emission Ceilings", "start_sec": 7800, "end_sec": 8450, "duration_min": 10.8, "objective": "Formulating sulfur dioxide (SO2) constraints.", "slide_deck": "Set 2 Slides", "slide_page": 11},
            {"id": "aug17_s15", "number": 15, "title": "AMR Robot Layout: Problem Context", "start_sec": 8450, "end_sec": 9050, "duration_min": 10.0, "objective": "Optimizing workstation layout for automated mobile robots.", "slide_deck": "Set 2 Slides", "slide_page": 12},
            {"id": "aug17_s16", "number": 16, "title": "AMR Layout: Manhattan Distance", "start_sec": 9050, "end_sec": 9650, "duration_min": 10.0, "objective": "Handling non-Euclidean grid movements in factories.", "slide_deck": "Set 2 Slides", "slide_page": 13},
            {"id": "aug17_s17", "number": 17, "title": "Linearizing Absolute Values in LP", "start_sec": 9650, "end_sec": 10000, "duration_min": 5.8, "objective": "Using u - v and u + v transformations.", "slide_deck": "Set 2 Slides", "slide_page": 14},
            {"id": "aug17_s18", "number": 18, "title": "Summary & Preview of Graphical Solutions", "start_sec": 10000, "end_sec": 10241, "duration_min": 4.0, "objective": "Bridging algebraic formulation to geometric intuition.", "slide_deck": "Set 2 Slides", "slide_page": 15}
        ],
        "slide_markers": [
            {"time_sec": 0, "deck": "Set 2 Slides", "slide": 1, "title": "Linear Programming Overview"},
            {"time_sec": 570, "deck": "Set 2 Slides", "slide": 2, "title": "Kantorovich & Koopmans (1975 Nobel)"},
            {"time_sec": 1140, "deck": "Set 2 Slides", "slide": 3, "title": "Structure of the LP Problem (Scalar)"},
            {"time_sec": 3450, "deck": "Set 2 Slides", "slide": 4, "title": "Review of Linear Algebra"},
            {"time_sec": 4050, "deck": "Set 2 Slides", "slide": 5, "title": "Structure of the LP Problem (Matrix)"},
            {"time_sec": 4650, "deck": "Set 2 Slides", "slide": 6, "title": "Dimensions of Matrices and Vectors"},
            {"time_sec": 5850, "deck": "Set 2 Slides", "slide": 8, "title": "Formulation Support Worksheet"},
            {"time_sec": 6500, "deck": "Set 2 Slides", "slide": 9, "title": "Coal Plant Formulation Case"},
            {"time_sec": 8450, "deck": "Set 2 Slides", "slide": 12, "title": "AMR Autonomous Mobile Robot Layout"}
        ],
        "key_concepts": [
            {"term": "Decision Variables (x)", "def": "The unknown quantities to be solved for, representing actionable choices (e.g. units produced, flow quantities)."},
            {"term": "Objective Function (Z)", "def": "A linear mathematical function of decision variables to be maximized (profit, yield) or minimized (cost, waste, time)."},
            {"term": "Technological Coefficients (A)", "def": "The matrix of coefficients a_ij denoting the consumption rate of resource i per unit of activity j."},
            {"term": "Right-Hand Side (b)", "def": "The vector of available resource limits, demand requirements, or capacities."},
            {"term": "Scalar vs Matrix LP", "def": "Scalar: Max Z = sum(c_j x_j) s.t. sum(a_ij x_j) <= b_i; Matrix: Max Z = c^T x s.t. Ax <= b, x >= 0."}
        ],
        "quizzes": [
            {
                "id": "q_aug17_1",
                "question": "Which pioneers shared the 1975 Nobel Memorial Prize in Economic Sciences for contributions to the theory of optimum allocation of resources?",
                "options": ["George Dantzig and John von Neumann", "Leonid Kantorovich and Tjalling Koopmans", "Alan Turing and Claude Shannon", "Hamdy Taha and Frederick Hillier"],
                "answer_idx": 1,
                "explanation": "Leonid Kantorovich and Tjalling Koopmans shared the 1975 Nobel Prize in Economics for their pioneering work on resource allocation and LP."
            },
            {
                "id": "q_aug17_2",
                "question": "In the standard matrix representation Max Z = c^T x subject to Ax <= b, x >= 0 with m constraints and n variables, what are the dimensions of matrix A and vector c?",
                "options": ["A is n x m, c is m x 1", "A is m x n, c is n x 1", "A is m x m, c is n x n", "A is n x n, c is m x 1"],
                "answer_idx": 1,
                "explanation": "Matrix A has m rows (constraints) and n columns (variables) so it is m x n. Vector c has n elements (n x 1)."
            }
        ]
    },
    {
        "id": "module_aug24",
        "folder": "August 24",
        "date": "August 24, 2026",
        "title": "Graphical Solution & Simplex Geometry in E² and E³",
        "subtitle": "Half-spaces, Polyhedra, Extreme Points, Basic Feasible Solutions, Simplex Concept",
        "syllabus_week": "Week 2 - 3",
        "syllabus_topic": "Graphical Solution, Basic Feasible Solution, Simplex Method",
        "default_video": "GMT20260824-100308_Recording_1920x1080.mp4",
        "default_slide_deck": "Set 3 Slides",
        "duration_minutes": 144.3,
        "xp_reward": 400,
        "description": "Visualizing LP geometry in Euclidean 2D and 3D space. Covers half-spaces, convex polyhedra, identifying corner points (extreme points), converting inequalities with slack variables, and understanding why the Simplex algorithm searches adjacent extreme points along polyhedral edges.",
        "sprints": [
            {"id": "aug24_s1", "number": 1, "title": "Euclidean Space E² & Graphical Intuition", "start_sec": 0, "end_sec": 570, "duration_min": 9.5, "objective": "Set up coordinate planes for 2-variable LP.", "slide_deck": "Set 3 Slides", "slide_page": 1},
            {"id": "aug24_s2", "number": 2, "title": "Plotting Constraint Lines & Hyperplanes", "start_sec": 570, "end_sec": 1140, "duration_min": 9.5, "objective": "Convert <= inequalities into boundary lines.", "slide_deck": "Set 3 Slides", "slide_page": 2},
            {"id": "aug24_s3", "number": 3, "title": "Half-Spaces & The Feasible Region", "start_sec": 1140, "end_sec": 1710, "duration_min": 9.5, "objective": "Determine the correct intersection of half-spaces.", "slide_deck": "Set 3 Slides", "slide_page": 2},
            {"id": "aug24_s4", "number": 4, "title": "Slope of the Objective Function", "start_sec": 1710, "end_sec": 2280, "duration_min": 9.5, "objective": "Derive the isoprofit line slope -c1/c2.", "slide_deck": "Set 3 Slides", "slide_page": 3},
            {"id": "aug24_s5", "number": 5, "title": "Sweeping Isoprofit Lines", "start_sec": 2280, "end_sec": 2880, "duration_min": 10.0, "objective": "Visually pushing Z outward across the polygon.", "slide_deck": "Set 3 Slides", "slide_page": 3},
            {"id": "aug24_s6", "number": 6, "title": "Extreme Points & Optimal Vertices", "start_sec": 2880, "end_sec": 3480, "duration_min": 10.0, "objective": "Why the optimum must hit a corner point.", "slide_deck": "Set 3 Slides", "slide_page": 3},
            {"id": "aug24_s7", "number": 7, "title": "Convex Sets & Polyhedra in E^n", "start_sec": 3480, "end_sec": 4080, "duration_min": 10.0, "objective": "Mathematical definition of polyhedra and convex hulls.", "slide_deck": "Set 3 Slides", "slide_page": 4},
            {"id": "aug24_s8", "number": 8, "title": "Fundamental Theorem of LP", "start_sec": 4080, "end_sec": 4680, "duration_min": 10.0, "objective": "Proof intuition of extreme point optimality.", "slide_deck": "Set 3 Slides", "slide_page": 5},
            {"id": "aug24_s9", "number": 9, "title": "Slack Variables & Standard Equality Form", "start_sec": 4680, "end_sec": 5280, "duration_min": 10.0, "objective": "Adding s_i >= 0 to make constraints equalities.", "slide_deck": "Set 4 Slides", "slide_page": 1},
            {"id": "aug24_s10", "number": 10, "title": "Basic vs Non-Basic Variables", "start_sec": 5280, "end_sec": 5880, "duration_min": 10.0, "objective": "Setting n-m variables to zero.", "slide_deck": "Set 4 Slides", "slide_page": 2},
            {"id": "aug24_s11", "number": 11, "title": "Basic Feasible Solutions (BFS) in E² and E³", "start_sec": 5880, "end_sec": 6500, "duration_min": 10.3, "objective": "Mapping algebraic BFS to geometric vertices.", "slide_deck": "Set 4 Slides", "slide_page": 2},
            {"id": "aug24_s12", "number": 12, "title": "What is a Simplex?", "start_sec": 6500, "end_sec": 7150, "duration_min": 10.8, "objective": "Geometric definition: n+1 vertices in n dimensions.", "slide_deck": "Set 4 Slides", "slide_page": 3},
            {"id": "aug24_s13", "number": 13, "title": "The Simplex Algorithm Concept", "start_sec": 7150, "end_sec": 7800, "duration_min": 10.8, "objective": "Traversing adjacent vertices along polyhedral edges.", "slide_deck": "Set 4 Slides", "slide_page": 4},
            {"id": "aug24_s14", "number": 14, "title": "Axis Directions & Edge Improvement", "start_sec": 7800, "end_sec": 8300, "duration_min": 8.3, "objective": "Examining pivot directions to strictly improve Z.", "slide_deck": "Set 4 Slides", "slide_page": 5},
            {"id": "aug24_s15", "number": 15, "title": "Summary & Preparation for Tableaus", "start_sec": 8300, "end_sec": 8655, "duration_min": 5.9, "objective": "Synthesizing geometry before the algebraic tableau.", "slide_deck": "Set 4 Slides", "slide_page": 6}
        ],
        "slide_markers": [
            {"time_sec": 0, "deck": "Set 3 Slides", "slide": 1, "title": "LP in 2D Euclidean Space E²"},
            {"time_sec": 570, "deck": "Set 3 Slides", "slide": 2, "title": "Graphical Solution: Half-spaces"},
            {"time_sec": 1710, "deck": "Set 3 Slides", "slide": 3, "title": "Isoprofit Lines & Finding Optimum"},
            {"time_sec": 3480, "deck": "Set 3 Slides", "slide": 4, "title": "Polyhedra & Higher Dimensions"},
            {"time_sec": 4080, "deck": "Set 3 Slides", "slide": 5, "title": "Geometry of General LP"},
            {"time_sec": 4680, "deck": "Set 4 Slides", "slide": 1, "title": "BFS in E² and E³"},
            {"time_sec": 6500, "deck": "Set 4 Slides", "slide": 3, "title": "Simplex Defined"},
            {"time_sec": 7150, "deck": "Set 4 Slides", "slide": 4, "title": "The Simplex Algorithm"}
        ],
        "key_concepts": [
            {"term": "Half-space", "def": "The set of points satisfying a linear inequality a^T x <= b in n-dimensional Euclidean space."},
            {"term": "Convex Polyhedron", "def": "The intersection of a finite number of closed half-spaces."},
            {"term": "Extreme Point (Corner Point)", "def": "A point in a convex set that cannot be expressed as a strict convex combination of any other two distinct points in the set."},
            {"term": "Fundamental Theorem of LP", "def": "If a linear program has an optimal solution, at least one optimal solution occurs at an extreme point (Basic Feasible Solution)."},
            {"term": "Basic Feasible Solution (BFS)", "def": "A solution obtained by setting n-m non-basic variables to zero and solving for the m basic variables, such that all basic variables are non-negative."}
        ],
        "quizzes": [
            {
                "id": "q_aug24_1",
                "question": "What is the geometric definition of an Extreme Point in a convex polyhedron?",
                "options": [
                    "The point farthest from the origin",
                    "A point that cannot be written as a convex combination of two other distinct points in the set",
                    "Any point located on the boundary of the feasible region",
                    "The point where all slack variables are equal to zero"
                ],
                "answer_idx": 1,
                "explanation": "An extreme point is a corner point of a convex set that cannot lie strictly between any two other points in the set."
            },
            {
                "id": "q_aug24_2",
                "question": "For an LP with m independent equality constraints and n variables (n > m), how many variables are set to 0 to find a Basic Solution?",
                "options": ["m variables", "n variables", "n - m non-basic variables", "m - n basic variables"],
                "answer_idx": 2,
                "explanation": "In an LP with m constraints and n variables, n - m variables are chosen as Non-Basic and set to zero; the remaining m are solved as Basic variables."
            }
        ]
    },
    {
        "id": "module_sep07",
        "folder": "September 7",
        "date": "September 7, 2026",
        "title": "The Simplex Method, Big-M & Two-Phase",
        "subtitle": "Tableau Construction, Optimality & Feasibility Conditions, Artificial Variables",
        "syllabus_week": "Week 3 - 4",
        "syllabus_topic": "Basic Feasible Solution, Simplex Method, Big-M Method, Two-Phase Method",
        "default_video": "GMT20260907-100234_Recording_1920x1128.mp4",
        "default_slide_deck": "Set 5 Slides",
        "duration_minutes": 98.0,
        "xp_reward": 450,
        "description": "Mastering the Simplex Tableau mechanics. Professor Lorenzo explains the pricing-out reduced cost row, selecting the entering variable via the most negative indicator (for max), determining the leaving variable via the Minimum Ratio Test, executing Gaussian pivot operations, and dealing with >= or = constraints using the Big-M penalty and Two-Phase methods.",
        "sprints": [
            {"id": "sep07_s1", "number": 1, "title": "Graphical to Tableau Bridge", "start_sec": 0, "end_sec": 540, "duration_min": 9.0, "objective": "Connecting points A, B, C, D to bases.", "slide_deck": "Set 5 Slides", "slide_page": 1},
            {"id": "sep07_s2", "number": 2, "title": "Standard Form & Slack Variables", "start_sec": 540, "end_sec": 1080, "duration_min": 9.0, "objective": "Formulating row 0 and identity basic variables.", "slide_deck": "Set 5 Slides", "slide_page": 2},
            {"id": "sep07_s3", "number": 3, "title": "Simplex Algorithm Step-by-Step Rules", "start_sec": 1080, "end_sec": 1620, "duration_min": 9.0, "objective": "Reduced costs and optimality tests.", "slide_deck": "Set 5 Slides", "slide_page": 3},
            {"id": "sep07_s4", "number": 4, "title": "The Entering Variable Decision", "start_sec": 1620, "end_sec": 2160, "duration_min": 9.0, "objective": "Choosing the most negative indicator in row 0.", "slide_deck": "Set 5 Slides", "slide_page": 3},
            {"id": "sep07_s5", "number": 5, "title": "The Minimum Ratio Test", "start_sec": 2160, "end_sec": 2700, "duration_min": 9.0, "objective": "Ensuring primal feasibility when selecting leaving variable.", "slide_deck": "Set 5 Slides", "slide_page": 3},
            {"id": "sep07_s6", "number": 6, "title": "Gauss-Jordan Pivot Elimination", "start_sec": 2700, "end_sec": 3300, "duration_min": 10.0, "objective": "Row operations to produce identity column vectors.", "slide_deck": "Set 5 Slides", "slide_page": 4},
            {"id": "sep07_s7", "number": 7, "title": "Why We Need Artificial Variables", "start_sec": 3300, "end_sec": 3900, "duration_min": 10.0, "objective": "Overcoming the lack of starting identity in >= and = constraints.", "slide_deck": "Set 5 Slides", "slide_page": 4},
            {"id": "sep07_s8", "number": 8, "title": "The Big-M Penalty Formulation", "start_sec": 3900, "end_sec": 4500, "duration_min": 10.0, "objective": "Adding -M sum(R_i) to penalize artificials.", "slide_deck": "Set 5 Slides", "slide_page": 5},
            {"id": "sep07_s9", "number": 9, "title": "Pricing Out Artificial Variables", "start_sec": 4500, "end_sec": 5100, "duration_min": 10.0, "objective": "Eliminating M from the initial row 0 before iteration.", "slide_deck": "Set 5 Slides", "slide_page": 5},
            {"id": "sep07_s10", "number": 10, "title": "Big-M Iterations & Pivot Steps", "start_sec": 5100, "end_sec": 5500, "duration_min": 6.7, "objective": "Driving artificial variables to zero.", "slide_deck": "Set 5 Slides", "slide_page": 6},
            {"id": "sep07_s11", "number": 11, "title": "Two-Phase Method Overview", "start_sec": 5500, "end_sec": 5882, "duration_min": 6.4, "objective": "Phase 1 artificial elimination vs Phase 2 original optimization.", "slide_deck": "Set 5 Slides", "slide_page": 7}
        ],
        "slide_markers": [
            {"time_sec": 0, "deck": "Set 5 Slides", "slide": 1, "title": "Graphical to Tableau Connection"},
            {"time_sec": 540, "deck": "Set 5 Slides", "slide": 2, "title": "Points A, B to Standard Form"},
            {"time_sec": 1080, "deck": "Set 5 Slides", "slide": 3, "title": "Simplex Algorithm ver 2 Rules"},
            {"time_sec": 2700, "deck": "Set 5 Slides", "slide": 4, "title": "Pivot Tableaus & Big-M Setup"},
            {"time_sec": 3900, "deck": "Set 5 Slides", "slide": 5, "title": "Big-M Initial Row 0 Setup"},
            {"time_sec": 5100, "deck": "Set 5 Slides", "slide": 6, "title": "Pricing Out & Simplex Iterations"}
        ],
        "key_concepts": [
            {"term": "Optimality Condition (Entering Variable)", "def": "In a maximization LP, the non-basic variable with the most negative coefficient in Row 0 (reduced cost z_j - c_j < 0) enters the basis to increase Z."},
            {"term": "Feasibility Condition (Leaving Variable / Min Ratio Test)", "def": "The leaving variable is the basic variable corresponding to min { b_i / a_ik | a_ik > 0 }, ensuring non-negativity is preserved."},
            {"term": "Pivot Operation", "def": "Gauss-Jordan row operations to convert the pivot column into a unit column vector with 1 at the pivot position and 0 everywhere else."},
            {"term": "Artificial Variables (R_i)", "def": "Non-negative variables added to >= or = constraints to provide an immediate starting basic feasible identity matrix. Penalized with huge cost M in the objective."}
        ],
        "quizzes": [
            {
                "id": "q_sep07_1",
                "question": "Why do constraints with a >= sign require an artificial variable R_i in addition to a surplus variable -e_i?",
                "options": [
                    "Because surplus variables cannot be multiplied by technological coefficients",
                    "Because subtracting a surplus variable gives a coefficient of -1, which cannot serve as an initial basic variable in the identity matrix",
                    "Because Big-M only works on maximization problems",
                    "Because the objective function cannot have negative coefficients"
                ],
                "answer_idx": 1,
                "explanation": "Subtracting surplus variable e_i yields -1 in that column. Since an initial basis requires positive identity columns (+1), an artificial variable +R_i is added."
            },
            {
                "id": "q_sep07_2",
                "question": "What is the purpose of the Minimum Ratio Test in the simplex algorithm?",
                "options": [
                    "To determine which variable will enter the basis to increase profit fastest",
                    "To guarantee that the solution remains feasible (non-negative) as the entering variable increases",
                    "To calculate the total number of iterations needed",
                    "To invert matrix B in O(1) time"
                ],
                "answer_idx": 1,
                "explanation": "The minimum ratio test ensures that as the entering variable increases, no current basic variable drops below zero, thereby preserving primal feasibility."
            }
        ]
    },
    {
        "id": "module_sep14",
        "folder": "September 14",
        "date": "September 14, 2026",
        "title": "Special Cases of LPs & Duality Theory",
        "subtitle": "Degeneracy, Alternative Optima, Unboundedness, Primal-Dual Relationships, Shadow Prices",
        "syllabus_week": "Week 4 - 6",
        "syllabus_topic": "Two-Phase Method, Special Cases of LPs, Dual Problem, Primal-Dual Relationships",
        "default_video": "GMT20260914-100102_Recording_1920x1128.mp4",
        "default_slide_deck": "Set 6 Slides",
        "duration_minutes": 128.2,
        "xp_reward": 500,
        "description": "Anomalies in Linear Programming and the profound beauty of Duality. Covers Degeneracy (cycling hazards and ties in min-ratio test), Alternative Optima, Unboundedness, Infeasibility, constructing the Dual from any Primal, Weak and Strong Duality theorems, Complementary Slackness, and economic interpretation of Shadow Prices using the Set 8 Support Worksheet.",
        "sprints": [
            {"id": "sep14_s1", "number": 1, "title": "Special Cases & Anomalies Intro", "start_sec": 0, "end_sec": 540, "duration_min": 9.0, "objective": "Recognizing non-standard LP outcomes.", "slide_deck": "Set 6 Slides", "slide_page": 1},
            {"id": "sep14_s2", "number": 2, "title": "Degeneracy: Ties in Min Ratio Test", "start_sec": 540, "end_sec": 1080, "duration_min": 9.0, "objective": "When one or more basic variables equal zero.", "slide_deck": "Set 6 Slides", "slide_page": 2},
            {"id": "sep14_s3", "number": 3, "title": "Cycling Risks & Bland's Rule", "start_sec": 1080, "end_sec": 1620, "duration_min": 9.0, "objective": "Preventing infinite looping in degenerate tableaus.", "slide_deck": "Set 6 Slides", "slide_page": 2},
            {"id": "sep14_s4", "number": 4, "title": "Alternative Optima: Flat Optimal Faces", "start_sec": 1620, "end_sec": 2160, "duration_min": 9.0, "objective": "Diagnosing zero reduced costs for non-basic variables.", "slide_deck": "Set 6 Slides", "slide_page": 3},
            {"id": "sep14_s5", "number": 5, "title": "Unbounded Solutions", "start_sec": 2160, "end_sec": 2700, "duration_min": 9.0, "objective": "When all entries in pivot column are non-positive.", "slide_deck": "Set 6 Slides", "slide_page": 4},
            {"id": "sep14_s6", "number": 6, "title": "Infeasible Solutions", "start_sec": 2700, "end_sec": 3240, "duration_min": 9.0, "objective": "When artificial variables cannot be eliminated.", "slide_deck": "Set 6 Slides", "slide_page": 5},
            {"id": "sep14_s7", "number": 7, "title": "Introduction to Duality Theory", "start_sec": 3240, "end_sec": 3840, "duration_min": 10.0, "objective": "Every LP has a companion mirror problem.", "slide_deck": "Set 8 Slides", "slide_page": 1},
            {"id": "sep14_s8", "number": 8, "title": "Constructing the Dual Problem", "start_sec": 3840, "end_sec": 4440, "duration_min": 10.0, "objective": "Primal Max <-> Dual Min; swapping c and b; transposing A.", "slide_deck": "Set 8 Slides", "slide_page": 4},
            {"id": "sep14_s9", "number": 9, "title": "The Weak Duality Theorem", "start_sec": 4440, "end_sec": 5040, "duration_min": 10.0, "objective": "Proving c^T x <= b^T y for any feasible pair.", "slide_deck": "Set 8 Slides", "slide_page": 5},
            {"id": "sep14_s10", "number": 10, "title": "The Strong Duality Theorem", "start_sec": 5040, "end_sec": 5640, "duration_min": 10.0, "objective": "At optimality, Max c^T x* = Min b^T y*.", "slide_deck": "Set 8 Slides", "slide_page": 5},
            {"id": "sep14_s11", "number": 11, "title": "Complementary Slackness", "start_sec": 5640, "end_sec": 6240, "duration_min": 10.0, "objective": "Zero products between variables and constraint slack.", "slide_deck": "Set 8 Slides", "slide_page": 8},
            {"id": "sep14_s12", "number": 12, "title": "Economic Interpretation & Shadow Prices", "start_sec": 6240, "end_sec": 6840, "duration_min": 10.0, "objective": "Shadow price y_i* as marginal value of resource i.", "slide_deck": "Set 8 Slides", "slide_page": 12},
            {"id": "sep14_s13", "number": 13, "title": "Set 8 Support Worksheet: Dual Simplex", "start_sec": 6840, "end_sec": 7300, "duration_min": 7.7, "objective": "Starting dual-feasible and pivoting to primal feasibility.", "slide_deck": "Set 8 Slides", "slide_page": 15},
            {"id": "sep14_s14", "number": 14, "title": "Midterm Exam Synthesis & Summary", "start_sec": 7300, "end_sec": 7692, "duration_min": 6.5, "objective": "Comprehensive course review for the midterm.", "slide_deck": "Set 8 Slides", "slide_page": 20}
        ],
        "slide_markers": [
            {"time_sec": 0, "deck": "Set 6 Slides", "slide": 1, "title": "Special Cases in LP"},
            {"time_sec": 540, "deck": "Set 6 Slides", "slide": 2, "title": "Degeneracy & Cycling"},
            {"time_sec": 1620, "deck": "Set 6 Slides", "slide": 3, "title": "Alternative Optima"},
            {"time_sec": 2160, "deck": "Set 6 Slides", "slide": 4, "title": "Unbounded LP Solution"},
            {"time_sec": 2700, "deck": "Set 6 Slides", "slide": 5, "title": "Infeasible LP Solution"},
            {"time_sec": 3240, "deck": "Set 8 Slides", "slide": 1, "title": "Duality Theory Overview"},
            {"time_sec": 3840, "deck": "Set 8 Slides", "slide": 4, "title": "Constructing the Dual from Primal"},
            {"time_sec": 4440, "deck": "Set 8 Slides", "slide": 5, "title": "Weak and Strong Duality"},
            {"time_sec": 5640, "deck": "Set 8 Slides", "slide": 8, "title": "Complementary Slackness"},
            {"time_sec": 6240, "deck": "Set 8 Slides", "slide": 12, "title": "Economic Interpretation (Shadow Prices)"}
        ],
        "key_concepts": [
            {"term": "Degeneracy", "def": "Occurs when there is a tie in the minimum ratio test, causing one or more basic variables to equal zero in subsequent tableaus; can potentially lead to cycling."},
            {"term": "Alternative Optima", "def": "Occurs when a non-basic variable has a reduced cost of 0 in the optimal tableau, meaning pivoting it into the basis achieves the same optimal objective value."},
            {"term": "Unbounded Solution", "def": "Occurs when an entering variable has all non-positive constraint coefficients (a_ik <= 0), allowing the variable to increase to infinity without violating feasibility."},
            {"term": "Weak Duality Theorem", "def": "For any primal-feasible solution x (max) and dual-feasible solution y (min), c^T x <= b^T y."},
            {"term": "Strong Duality Theorem", "def": "If either the primal or dual problem has a finite optimal solution, so does the other, and their optimal objective values are equal: c^T x* = b^T y*."},
            {"term": "Shadow Price (Dual Variable y_i*)", "def": "The marginal value of resource i: the change in the optimal objective value per unit increase in the right-hand side b_i."}
        ],
        "quizzes": [
            {
                "id": "q_sep14_1",
                "question": "What symptom in an optimal simplex tableau indicates the presence of Alternative Optima?",
                "options": [
                    "All basic variables are equal to zero",
                    "A non-basic variable has a zero coefficient in row 0 (reduced cost = 0)",
                    "All technological coefficients in row 1 are negative",
                    "An artificial variable remains basic with a value greater than 0"
                ],
                "answer_idx": 1,
                "explanation": "If a non-basic variable has 0 in the objective row of an optimal tableau, pivoting it into the basis will not change the objective value, revealing another optimal corner point."
            },
            {
                "id": "q_sep14_2",
                "question": "According to the Strong Duality Theorem, if the primal problem is a maximization LP with optimal objective value Z* = 120, what is the optimal value W* of the dual problem?",
                "options": ["W* = -120", "W* = 120", "W* >= 240", "W* is unbounded"],
                "answer_idx": 1,
                "explanation": "Strong Duality states that at optimality, the primal objective and dual objective are strictly equal: Max c^T x* = Min b^T y* = 120."
            }
        ]
    },
    {
        "id": "module_oct5",
        "folder": "October 5",
        "date": "October 5, 2026",
        "title": "Duality Applications, Sensitivity Analysis & Midterm Exam Review",
        "subtitle": "Dual Bound Squeezing, Shadow Prices, RHS & Objective Ranging, Midterm Comprehensive Prep",
        "syllabus_week": "Week 6",
        "syllabus_topic": "Duality Applications, Sensitivity Analysis, Comprehensive Review",
        "default_video": "GMT20261005-100352_Recording_1920x1128.mp4",
        "default_slide_deck": "Set 8 Slides",
        "duration_minutes": 114.6,
        "xp_reward": 600,
        "description": "Professor Lowell Lorenzo covers the profound power of Duality: how the Primal (lower bound) and Dual (upper bound) squeeze the optimal gap until Z* = W*. Discusses shadow prices as marginal resource values, allowable ranges for objective coefficients and right-hand side capacities, and conducts an extensive midterm review for the October 10 exam.",
        "sprints": [
            {"id": "oct5_s1", "number": 1, "title": "Welcome & Midterm Exam Overview", "start_sec": 0, "end_sec": 540, "duration_min": 9.0, "objective": "Midterm coverage, question formats, and review approach.", "slide_deck": "Set 8 Slides", "slide_page": 1},
            {"id": "oct5_s2", "number": 2, "title": "Midterm Problem 1 Exercise Q&A", "start_sec": 540, "end_sec": 1140, "duration_min": 10.0, "objective": "Clarifying formulation nuances and decision variable definitions.", "slide_deck": "Set 8 Slides", "slide_page": 3},
            {"id": "oct5_s3", "number": 3, "title": "Duality Bounds: The Squeezing Principle", "start_sec": 1140, "end_sec": 1740, "duration_min": 10.0, "objective": "How primal Z and dual W converge to optimality.", "slide_deck": "Set 8 Slides", "slide_page": 5},
            {"id": "oct5_s4", "number": 4, "title": "Weak & Strong Duality in Problem Solving", "start_sec": 1740, "end_sec": 2340, "duration_min": 10.0, "objective": "Using dual bounds to verify optimality without running full simplex.", "slide_deck": "Set 8 Slides", "slide_page": 6},
            {"id": "oct5_s5", "number": 5, "title": "Complementary Slackness Theorem", "start_sec": 2340, "end_sec": 2940, "duration_min": 10.0, "objective": "Relating primal slack variables to dual decision variables.", "slide_deck": "Set 8 Slides", "slide_page": 8},
            {"id": "oct5_s6", "number": 6, "title": "Shadow Prices: Economic Meaning & Limits", "start_sec": 2940, "end_sec": 3540, "duration_min": 10.0, "objective": "Interpreting dual values as unit resource worth and validity ranges.", "slide_deck": "Set 8 Slides", "slide_page": 12},
            {"id": "oct5_s7", "number": 7, "title": "Sensitivity Analysis: RHS Capacities (b_i)", "start_sec": 3540, "end_sec": 4140, "duration_min": 10.0, "objective": "Computing allowable increase and decrease before basis changes.", "slide_deck": "Set 8 Slides", "slide_page": 14},
            {"id": "oct5_s8", "number": 8, "title": "Sensitivity Analysis: Objective Coefficients (c_j)", "start_sec": 4140, "end_sec": 4740, "duration_min": 10.0, "objective": "Allowable variations for basic vs non-basic variables.", "slide_deck": "Set 8 Slides", "slide_page": 16},
            {"id": "oct5_s9", "number": 9, "title": "Dual Simplex Mechanics", "start_sec": 4740, "end_sec": 5340, "duration_min": 10.0, "objective": "Pivoting when RHS is infeasible but row 0 is optimal.", "slide_deck": "Set 8 Slides", "slide_page": 18},
            {"id": "oct5_s10", "number": 10, "title": "Walkthrough of Additional Midterm Exercises", "start_sec": 5340, "end_sec": 5940, "duration_min": 10.0, "objective": "Formulation breakdown and common traps to avoid on the exam.", "slide_deck": "Set 8 Slides", "slide_page": 20},
            {"id": "oct5_s11", "number": 11, "title": "Final Exam Advice & Study Strategy", "start_sec": 5940, "end_sec": 6874, "duration_min": 15.6, "objective": "Time management, showing complete units, and simplex tie-breakers.", "slide_deck": "Set 8 Slides", "slide_page": 22}
        ],
        "slide_markers": [
            {"time_sec": 0, "deck": "Set 8 Slides", "slide": 1, "title": "Duality & Sensitivity Review"},
            {"time_sec": 540, "deck": "Set 8 Slides", "slide": 3, "title": "Midterm Exercise 1 Formulation"},
            {"time_sec": 1740, "deck": "Set 8 Slides", "slide": 6, "title": "Weak and Strong Duality"},
            {"time_sec": 2340, "deck": "Set 8 Slides", "slide": 8, "title": "Complementary Slackness"},
            {"time_sec": 2940, "deck": "Set 8 Slides", "slide": 12, "title": "Shadow Price Interpretation"},
            {"time_sec": 3540, "deck": "Set 8 Slides", "slide": 14, "title": "RHS Sensitivity & Allowable Ranges"},
            {"time_sec": 4140, "deck": "Set 8 Slides", "slide": 16, "title": "Objective Coefficient Sensitivity"},
            {"time_sec": 4740, "deck": "Set 8 Slides", "slide": 18, "title": "Dual Simplex Mechanics"},
            {"time_sec": 5940, "deck": "Set 8 Slides", "slide": 22, "title": "Midterm Study Guidelines & Final Tips"}
        ],
        "key_concepts": [
            {"term": "Primal-Dual Bound Squeezing", "def": "The primal objective Z provides a lower bound, and the dual objective W provides an upper bound. The gap closes until Z* = W*."},
            {"term": "Shadow Price (Dual Variable)", "def": "Rate of improvement in optimal objective Z per unit increase in RHS resource b_i, valid only within the allowable range."},
            {"term": "Allowable Range", "def": "The range over which an objective coefficient or RHS value can change without changing the current optimal basis."},
            {"term": "Complementary Slackness", "def": "At optimality, (x_j * dual_slack_j) = 0 and (y_i * primal_slack_i) = 0."},
            {"term": "Dual Simplex Method", "def": "An algorithm that maintains optimality (Row 0 >= 0) while iterating toward primal feasibility (RHS >= 0), ideal for RHS changes."}
        ],
        "quizzes": [
            {
                "id": "q_oct5_1",
                "question": "What is the relationship between the optimal primal objective Z* and the optimal dual objective W* according to Strong Duality?",
                "options": [
                    "Z* is always strictly greater than W*",
                    "Z* = W* at the optimal solution",
                    "Z* + W* = 0",
                    "Z* is unrelated to W*"
                ],
                "answer_idx": 1,
                "explanation": "Strong Duality states that at optimality, the primal maximum objective equals the dual minimum objective (Z* = W*)."
            },
            {
                "id": "q_oct5_2",
                "question": "When does multiplying a resource change Delta b_i by its Shadow Price y_i* fail to predict the new optimal objective value?",
                "options": [
                    "When the LP has only 2 variables",
                    "When the change Delta b_i exceeds the allowable range and forces a change in the optimal basis",
                    "When the objective is minimization",
                    "When all slack variables are zero"
                ],
                "answer_idx": 1,
                "explanation": "Shadow prices are valid only within the allowable range where the optimal basis B remains unchanged. Exceeding the range causes basic variables to turn negative, requiring a new basis."
            },
            {
                "id": "q_oct5_3",
                "question": "In which situation is the Dual Simplex method used instead of the standard Primal Simplex method?",
                "options": [
                    "When the solution is already primal-feasible but not optimal",
                    "When row 0 satisfies optimality (all reduced costs >= 0 for max) but one or more RHS values are negative (infeasible)",
                    "Only when using Big-M with artificial variables",
                    "When the objective function is non-linear"
                ],
                "answer_idx": 1,
                "explanation": "The Dual Simplex starts with dual-feasibility (optimality in Row 0) and pivots to eliminate negative RHS values, restoring primal feasibility."
            }
        ]
    }
]

RANKS_DATA = [
    {"rank": 1, "title": "OR Novice", "min_xp": 0, "badge": "🌱"},
    {"rank": 2, "title": "Decision Modeler", "min_xp": 300, "badge": "📐"},
    {"rank": 3, "title": "Convex Explorer", "min_xp": 750, "badge": "🔷"},
    {"rank": 4, "title": "Simplex Apprentice", "min_xp": 1400, "badge": "⚙️"},
    {"rank": 5, "title": "Tableau Tactician", "min_xp": 2200, "badge": "📊"},
    {"rank": 6, "title": "Big-M Conqueror", "min_xp": 3200, "badge": "🛡️"},
    {"rank": 7, "title": "Anomaly Hunter", "min_xp": 4400, "badge": "⚡"},
    {"rank": 8, "title": "Duality Alchemist", "min_xp": 5800, "badge": "🔮"},
    {"rank": 9, "title": "Grand Optimization Sage", "min_xp": 7500, "badge": "👑"}
]

BADGES_DATA = [
    {"id": "first_play", "title": "First Step", "description": "Played your first IE 214 lecture video", "icon": "🎬", "xp": 50},
    {"id": "speed_demon", "title": "Speed Learner", "description": "Used playback speed modifier (1.5x or higher)", "icon": "⚡", "xp": 75},
    {"id": "transcript_scout", "title": "Transcript Scout", "description": "Jumped to 5 lecture timestamps via the transcript reader", "icon": "📜", "xp": 100},
    {"id": "slide_synced", "title": "Slide Navigator", "description": "Synchronized slide deck with live video playback", "icon": "🖼️", "xp": 100},
    {"id": "sprint_champion", "title": "Focus Sprint Champion", "description": "Completed 3 ADHD bite-sized focus sprints", "icon": "🎯", "xp": 100},
    {"id": "slide_calibrator", "title": "Slide Calibrator", "description": "Pinned or calibrated a slide timestamp to the video", "icon": "📍", "xp": 75},
    {"id": "pivot_master", "title": "Simplex Pivot Master", "description": "Successfully solved a Simplex pivot step in the minigame", "icon": "🎯", "xp": 150},
    {"id": "graphical_guru", "title": "Graphical Guru", "description": "Maximized an objective function on the 2D Graphical canvas", "icon": "📈", "xp": 150},
    {"id": "formulation_forge", "title": "Formulation Architect", "description": "Formulated the AMR Mobile Robot or Coal Plant LP problem", "icon": "🤖", "xp": 200},
    {"id": "tableau_detective", "title": "Tableau Detective", "description": "Solved the Exercise 3 missing coefficient tableau puzzle", "icon": "🔍", "xp": 250},
    {"id": "quiz_flawless", "title": "Quiz Perfectionist", "description": "Scored 100% on any lecture quiz challenge", "icon": "⭐", "xp": 200},
    {"id": "study_streak_3", "title": "Optimization Devotee", "description": "Maintained a 3-session study streak", "icon": "🔥", "xp": 150}
]

# Interactive Minigames definitions
MINIGAMES_DATA = {
    "simplex_pivot": {
        "title": "Simplex Pivot Master",
        "description": "Examine the simplex tableau below. Identify the entering variable (most negative reduced cost in Row 0), select the leaving variable via the minimum ratio test, and execute the Jordan-Gauss pivot!",
        "scenario": {
            "problem": "Maximize Z = 3x1 + 5x2 subject to:\nx1 <= 4\n2x2 <= 12\n3x1 + 2x2 <= 18\nx1, x2 >= 0",
            "tableaus": [
                {
                    "step": 1,
                    "title": "Initial Tableau (Basis: s1, s2, s3)",
                    "headers": ["Basic", "x1", "x2", "s1", "s2", "s3", "RHS", "Ratio"],
                    "rows": [
                        {"basic": "Z", "vals": [-3, -5, 0, 0, 0, 0], "is_obj": True},
                        {"basic": "s1", "vals": [1, 0, 1, 0, 0, 4], "ratio": "4 / 0 = N/A"},
                        {"basic": "s2", "vals": [0, 2, 0, 1, 0, 12], "ratio": "12 / 2 = 6"},
                        {"basic": "s3", "vals": [3, 2, 0, 0, 1, 18], "ratio": "18 / 2 = 9"}
                    ],
                    "entering_col_idx": 1,
                    "entering_var": "x2",
                    "leaving_row_idx": 2,
                    "leaving_var": "s2",
                    "pivot_val": 2,
                    "hint": "In row 0 (Z), coefficients are -3 (for x1) and -5 (for x2). -5 is the most negative, so x2 enters! For leaving variable: s2 has ratio 12/2 = 6, while s3 has ratio 18/2 = 9. 6 < 9, so s2 leaves!"
                },
                {
                    "step": 2,
                    "title": "Tableau After Pivot 1 (Basis: s1, x2, s3)",
                    "headers": ["Basic", "x1", "x2", "s1", "s2", "s3", "RHS", "Ratio"],
                    "rows": [
                        {"basic": "Z", "vals": [-3, 0, 0, 2.5, 0, 30], "is_obj": True},
                        {"basic": "s1", "vals": [1, 0, 1, 0, 0, 4], "ratio": "4 / 1 = 4"},
                        {"basic": "x2", "vals": [0, 1, 0, 0.5, 0, 6], "ratio": "6 / 0 = N/A"},
                        {"basic": "s3", "vals": [3, 0, 0, -1, 1, 6], "ratio": "6 / 3 = 2"}
                    ],
                    "entering_col_idx": 0,
                    "entering_var": "x1",
                    "leaving_row_idx": 3,
                    "leaving_var": "s3",
                    "pivot_val": 3,
                    "hint": "In row 0, x1 has coefficient -3. So x1 enters! For leaving variable: s1 ratio is 4/1 = 4; s3 ratio is 6/3 = 2. 2 is the minimum ratio, so s3 leaves!"
                },
                {
                    "step": 3,
                    "title": "Final Optimal Tableau (Basis: s1, x2, x1)",
                    "headers": ["Basic", "x1", "x2", "s1", "s2", "s3", "RHS", "Ratio"],
                    "rows": [
                        {"basic": "Z", "vals": [0, 0, 0, 1.5, 1, 36], "is_obj": True},
                        {"basic": "s1", "vals": [0, 0, 1, 0.333, -0.333, 2], "ratio": "-"},
                        {"basic": "x2", "vals": [0, 1, 0, 0.5, 0, 6], "ratio": "-"},
                        {"basic": "x1", "vals": [1, 0, 0, -0.333, 0.333, 2], "ratio": "-"}
                    ],
                    "is_optimal": True,
                    "optimal_summary": "All coefficients in Row 0 are >= 0! Optimal solution found: x1* = 2, x2* = 6, s1* = 2, s2* = 0, s3* = 0. Maximum Objective Z* = 36!"
                }
            ]
        }
    },
    "graphical_arena": {
        "title": "2D Graphical LP Arena",
        "description": "Plot half-spaces in Euclidean space E^2, observe the convex feasible polyhedron, and slide the isoprofit objective line to hit the optimal extreme point!",
        "problem": {
            "objective": "Maximize Z = 3x1 + 5x2",
            "c1": 3,
            "c2": 5,
            "constraints": [
                {"name": "Constraint 1", "eq": "x1 <= 4", "a1": 1, "a2": 0, "b": 4, "color": "#f87171"},
                {"name": "Constraint 2", "eq": "2x2 <= 12  (x2 <= 6)", "a1": 0, "a2": 2, "b": 12, "color": "#60a5fa"},
                {"name": "Constraint 3", "eq": "3x1 + 2x2 <= 18", "a1": 3, "a2": 2, "b": 18, "color": "#34d399"}
            ],
            "extreme_points": [
                {"point": "A", "x1": 0, "x2": 0, "z": 0, "label": "(0, 0)"},
                {"point": "B", "x1": 4, "x2": 0, "z": 12, "label": "(4, 0)"},
                {"point": "C", "x1": 4, "x2": 3, "z": 27, "label": "(4, 3) - Boundary"},
                {"point": "D", "x1": 2, "x2": 6, "z": 36, "label": "(2, 6) - OPTIMAL!", "is_optimal": True},
                {"point": "E", "x1": 0, "x2": 6, "z": 30, "label": "(0, 6)"}
            ]
        }
    },
    "formulation_forge": {
        "title": "LP Formulation Forge",
        "description": "Construct standard LP models from real IE 214 scenario descriptions (Autonomous Mobile Robot AMR Layout & Coal Fired Plant problem).",
        "scenarios": [
            {
                "id": "amr_layout",
                "title": "IE 214 Exercise: Autonomous Mobile Robot (AMR) Homebase",
                "source": "Exercises/IE 214 LP Formulation AMR Layout.pdf",
                "description": "In an Intelligent Manufacturing Lab, an AMR must service workstations at coordinates (x_i, y_i) with delivery frequencies w_i. Determine the optimal homebase coordinates (x0, y0) to minimize total weighted Manhattan distance sum w_i (|x0 - x_i| + |y0 - y_i|).",
                "questions": [
                    {
                        "step": "Step 1: Linearizing Absolute Values",
                        "prompt": "How do we reformulate the non-linear absolute value term |x0 - x_i| into linear constraints?",
                        "options": [
                            "Square both sides to get (x0 - x_i)^2",
                            "Define non-negative variables u_i, v_i >= 0 such that (x0 - x_i) = u_i - v_i and replace |x0 - x_i| with u_i + v_i",
                            "Set x0 equal to the average of all x_i",
                            "Ignore the absolute values since coordinates are always positive"
                        ],
                        "correct": 1,
                        "explanation": "Any variable or difference d can be represented as the difference of two non-negative variables d = u - v, where |d| = u + v provided u, v >= 0."
                    },
                    {
                        "step": "Step 2: Linear LP Formulation",
                        "prompt": "What is the linear objective function to minimize total weighted distance for N workstations?",
                        "options": [
                            "Min sum(w_i * (x0^2 + y0^2))",
                            "Min sum(w_i * (u_xi + v_xi + u_yi + v_yi))",
                            "Max sum(w_i * (u_xi - v_xi))",
                            "Min sum(x0 - w_i)"
                        ],
                        "correct": 1,
                        "explanation": "The linear objective minimizes sum_{i=1}^N w_i (u_{xi} + v_{xi} + u_{yi} + v_{yi}), subject to x0 - x_i = u_{xi} - v_{xi} and y0 - y_i = u_{yi} - v_{yi} with u, v >= 0."
                    }
                ]
            },
            {
                "id": "coal_plant",
                "title": "IE 214 Exercise: Coal-Fired Power Plant Emissions",
                "source": "Exercises/LP Formulation Coal Fired Plant.pdf",
                "description": "A power plant burns Grade A and Grade B coal to generate electricity while complying with strict Clean Air environmental standards on sulfur dioxide (SO2) and particulate emissions.",
                "questions": [
                    {
                        "step": "Step 1: Identifying Decision Variables",
                        "prompt": "What should the decision variables represent?",
                        "options": [
                            "xA and xB: Total megawatts of electricity consumed by the city",
                            "xA and xB: Tons of Grade A and Grade B coal burned per day",
                            "xA and xB: Total kilograms of sulfur emitted into the atmosphere",
                            "xA and xB: Market price per ton of coal"
                        ],
                        "correct": 1,
                        "explanation": "The plant manager controls how many tons of each grade of coal to blend and burn daily."
                    },
                    {
                        "step": "Step 2: Constraint Structure",
                        "prompt": "If burning Grade A emits 18 kg SO2/ton and Grade B emits 32 kg SO2/ton with an EPA daily limit of 2,500 kg, how is this constraint written?",
                        "options": [
                            "18 xA + 32 xB >= 2500",
                            "18 xA + 32 xB <= 2500",
                            "xA + xB <= 2500 / 50",
                            "(18/xA) + (32/xB) <= 2500"
                        ],
                        "correct": 1,
                        "explanation": "The total emissions 18 xA + 32 xB must not exceed the ceiling limit of 2,500 kg/day."
                    }
                ]
            }
        ]
    },
    "tableau_detective": {
        "title": "Tableau Detective: Exercise 3 Puzzle",
        "source": "Exercises/Exercise 3 LP.pdf",
        "description": "In Prof. Lorenzo's Midterm Exercise 3, several coefficients in the simplex tableau were redacted (A, B, C, D, E, F, G). Use simplex tableau matrix relationships B^-1 A and row 0 pricing-out properties to deduce each missing value!",
        "puzzle": {
            "raw_tableau": [
                ["Basic", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "Solution"],
                ["z", "0", "G", "0", "A", "3", "B", "C", "42"],
                ["x2", "0", "1", "0", "D", "1", "0", "3", "E"],
                ["x3", "0", "0", "1", "-2", "2", "F", "-1", "2"],
                ["x1", "1", "0", "0", "0", "-1", "2", "1", "3"]
            ],
            "questions": [
                {
                    "letter": "G",
                    "prompt": "What is the value of G in row 0 under x2?",
                    "options": ["0", "1", "-3", "5"],
                    "correct": 0,
                    "explanation": "x2 is a basic variable! The coefficient in row 0 for any current basic variable is always identically 0."
                },
                {
                    "letter": "F",
                    "prompt": "Given that x6 was originally a slack variable in constraint 2, what is the value of F?",
                    "options": ["0", "1", "-1", "2"],
                    "correct": 1,
                    "explanation": "From the basic variable identity columns and B^-1 representation, column x6 corresponds to the second column of B^-1, yielding F = 1."
                }
            ]
        }
    }
}

EXAM_INTEL_DATA = [
    {
        "id": "intel_sep14_tie_break",
        "module_id": "module_sep14",
        "folder": "September 14",
        "lecture_date": "September 14, 2026",
        "time_sec": 4880,
        "time_str": "01:21:20",
        "category": "rules",
        "category_label": "Mandatory Tie-Breaking Rule",
        "severity": "critical",
        "title": "Simplex Tie-Breaking: Pick Smaller Variable Index for Entering & Leaving",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "So sa exam, kung nari pinili mo si x4 kahit na pwede rin siya, hindi siya ikokonsider ng correct yung solution mo. It's just a local rule that we will be adopting so that I will not have difficulty grading papers with multiple solutions. Clear to everyone? So even for entering variable, kung nari ito minus 9 yan, minus 9 yan, ano yung entering variable natin? X1 kasi smaller index... So kung pinili nyo ang x2, hindi tama yung solution nyo kahit na theoretically puwede rin siya... Using our local rule, the leaving variable will be x3, hindi x4.",
        "summary": "Prof. Lorenzo enforces a strict local tie-breaking rule for both entering and leaving variables so all students take an identical solution path and avoid multiple solutions during paper grading.",
        "action_rule": "1) Entering Variable Tie: Pick the non-basic variable with the smaller subscript index (e.g., choose x1 over x2). 2) Leaving Variable Tie (Min Ratio Test): Pick the basic variable with the smaller subscript index (e.g., choose x3 over x4). Choosing the other variable will be marked INCORRECT in the exam!"
    },
    {
        "id": "intel_sep14_midterm_indicative",
        "module_id": "module_sep14",
        "folder": "September 14",
        "lecture_date": "September 14, 2026",
        "time_sec": 329,
        "time_str": "00:05:29",
        "category": "scope",
        "category_label": "Midterm Scope Confirmation",
        "severity": "high",
        "title": "Handout Exercises Are Indicative & Drawn From Midterm Exams",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "I'm telling you, these exercises are very indicative of what you will expect in the midterm. Kaya I want you to do these exercises kasi at least pag ginawa ninyo itong exercises na ito, alam ninyo more or less kung ano yung gagawin ninyo... you know, how you will do the problems that are assigned or given in the midterm exam.",
        "summary": "Prof. Lorenzo explicitly confirms that the problems in the Exercises folder (Exercise 3 LP, IE 214 Exercises Midterm, and Midterm Additional) are past exam problems and mirror the exact structure of the midterm exam.",
        "action_rule": "Prioritize solving every problem in Exercises/ ('IE 214 Exercises Midterm.pdf', 'Exercise 3 LP.pdf', 'Midterm Additional.pdf'). They are directly indicative of what will appear in your exam."
    },
    {
        "id": "intel_sep14_convex_combination",
        "module_id": "module_sep14",
        "folder": "September 14",
        "lecture_date": "September 14, 2026",
        "time_sec": 6255,
        "time_str": "01:44:15",
        "category": "format",
        "category_label": "Exam Question Format",
        "severity": "critical",
        "title": "Alternative Optima: Complete Solution MUST Use Convex Combination",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Now, if I ask you the question in the exam, 'can you please give me the complete optimal solution of this LP?'... If you answer just point B and point C, is that complete? No! ... The complete optimal solution is all points in the line segment BC. And if I ask for a mathematical expression: you must use the convex combination of the two vectors: x = t * B + (1 - t) * C, where 0 <= t <= 1.",
        "summary": "When alternative optima exist, identifying only the two optimal corner points is incomplete and loses points because all points along the connecting line segment are also optimal.",
        "action_rule": "Always express the complete optimal solution set as a convex combination: x* = α x_B + (1 - α) x_C for 0 ≤ α ≤ 1. Never just list the two extreme points alone."
    },
    {
        "id": "intel_aug24_variable_definition",
        "module_id": "module_aug24",
        "folder": "August 24",
        "lecture_date": "August 24, 2026",
        "time_sec": 1050,
        "time_str": "00:17:30",
        "category": "grading",
        "category_label": "Grading Rubric Trap",
        "severity": "critical",
        "title": "Decision Variables: 2 Mandatory Attributes (UOM & Decision Action)",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Will you get full points for that if that's the way you define your decision variables? I will tell you it will not get full points. The reason why it will not get full points is because there are two attributes that I'm looking for whenever you define your decision variables: 1) The unit of measure (UOM), and 2) The decision involved... If you just define it as x1, x2, you will not get full points. Most probably you'll get around 6 or 7 out of 10 points. Just to give you an idea of how I will be grading you.",
        "summary": "Prof. Lorenzo strictly deducts 30% to 40% of points on variable definitions if both the unit of measurement and specific decision action are not explicitly written.",
        "action_rule": "In every LP formulation, state: 1) Unit of Measurement (e.g., meters, tons/day, hours), and 2) Exact decision action (e.g., 'x1 = x-coordinate in meters where AMR home base will be placed'). Never just write 'x1 = coordinate'."
    },
    {
        "id": "intel_aug24_simplex_iterations",
        "module_id": "module_aug24",
        "folder": "August 24",
        "lecture_date": "August 24, 2026",
        "time_sec": 7550,
        "time_str": "02:05:50",
        "category": "scope",
        "category_label": "Exam Calculation Scope",
        "severity": "info",
        "title": "Simplex in Exam: Maximum 1 Iteration Expected (Calculations are Minimal)",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Sabi mo, sa exam ba, marami bang calculations na gagawin... You are not computers, okay? I'm not testing you how good you are in multiplying, dividing, or doing whatever operation. So in the exam, expect, as I've told you, Aldrin, there will be very minimal calculations. So if there, in the simplex algorithm, if there's any calculation, you will be expected to be only doing ONE ITERATION just to demonstrate to me that you know how to do that iteration... That's what you should expect in an exam.",
        "summary": "The professor emphasizes that exams test conceptual comprehension, not computer-like numerical crunching. You will only be asked for at most 1 pivot iteration.",
        "action_rule": "Do not waste time practicing 5-iteration manual arithmetic. Master the mechanics of 1 clean iteration: selecting the pivot column, minimum ratio test for pivot row, and row-reducing to update the basis."
    },
    {
        "id": "intel_aug17_formulation_timelimit",
        "module_id": "module_aug17",
        "folder": "August 17",
        "lecture_date": "August 17, 2026",
        "time_sec": 9330,
        "time_str": "02:35:30",
        "category": "scope",
        "category_label": "Midterm Exam Scope",
        "severity": "high",
        "title": "Midterm Guaranteed Question: LP Formulation Within 2-Hour Limit",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "And in the midterm exam, I will be asking you to formulate a linear programming problem. A linear program... in your exam, you only have a two hour exam time period. The level of difficulty will be adjusted according to the time that is given to you.",
        "summary": "A comprehensive real-world LP formulation problem is guaranteed on the midterm. Problem complexity will be calibrated to the strict 2-hour examination window.",
        "action_rule": "Train on translating word problems into LP equations within 20-30 minutes. Focus on: 1) Clear variable definitions, 2) Technological constraints, 3) Capacity upper/lower bounds, 4) Non-negativity."
    },
    {
        "id": "intel_aug17_no_llm",
        "module_id": "module_aug17",
        "folder": "August 17",
        "lecture_date": "August 17, 2026",
        "time_sec": 9690,
        "time_str": "02:41:30",
        "category": "policy",
        "category_label": "Exam Policy Warning",
        "severity": "warning",
        "title": "Exam Condition: Zero LLM / Solver Access—Must Formulate Independently",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Because in the exam you will not have the LLM with you. When you answer the problem that I will give you in the exam there is no LLM there to help you. So do not be overly dependent on it. Help make it a tool to supplement the learnings that were given to you in this class.",
        "summary": "Students are cautioned against relying on AI tools for problem solving during review, as the in-person/proctored exam requires formulating models on paper without aids.",
        "action_rule": "Practice solving formulation exercises without ChatGPT or Excel Solver open. Test whether you can identify indices, parameters, and constraints independently."
    },
    {
        "id": "intel_aug17_gauss_jordan_minimal",
        "module_id": "module_aug17",
        "folder": "August 17",
        "lecture_date": "August 17, 2026",
        "time_sec": 9768,
        "time_str": "02:42:48",
        "category": "scope",
        "category_label": "Exam Calculation Scope",
        "severity": "info",
        "title": "Gauss-Jordan in Exam: Very Minimal Calculations, No Large Inversions",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Hypothetical question: Yung Gauss Jordan, gagawin po ba yun sa exam kasi napakahaba po? ... The calculations done in my exam are very minimal... Aldwin, you'll do very minimal, but you will do calculations, but very minimal.",
        "summary": "Students asked if long Gauss-Jordan reduction is required on exams. Prof. Lorenzo confirmed arithmetic will be very minimal.",
        "action_rule": "Understand how Gauss-Jordan relates to standard canonical form and tableau updates (multiplying by B^-1), but don't fear tedious manual 4x4 matrix inversions on paper."
    },
    {
        "id": "intel_aug17_midterm_date",
        "module_id": "module_aug17",
        "folder": "August 17",
        "lecture_date": "August 17, 2026",
        "time_sec": 10068,
        "time_str": "02:47:48",
        "category": "schedule",
        "category_label": "Important Date",
        "severity": "info",
        "title": "Midterm Exam Schedule: October 10 Target Date",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Sir regarding sa midterm, sa October 10... Okay lang sir ako na po sa original na schedule. Sure.",
        "summary": "The midterm exam schedule discussed during class with students with conflict schedules.",
        "action_rule": "Keep midterm target date in mind and complete all problem sets ahead of time."
    },
    {
        "id": "intel_sep14_infeasibility_trap",
        "module_id": "module_sep14",
        "folder": "September 14",
        "lecture_date": "September 14, 2026",
        "time_sec": 3692,
        "time_str": "01:01:32",
        "category": "traps",
        "category_label": "Common Pitfall / Trap",
        "severity": "critical",
        "title": "Feasibility Trap: Basic Solutions with Negative Values Are NOT BFS",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Notice when we solve for x2, we get x2 = 4 - 5(4/3) = -8/3 < 0. Since x2 is negative, this violates non-negativity xj >= 0. Therefore, this is an infeasible basic solution and not a BFS!",
        "summary": "A common exam error is setting n-m variables to 0, solving the system, and forgetting to verify xj >= 0 before calculating objective Z.",
        "action_rule": "Always check non-negativity for every solved basic variable. If any xj < 0, explicitly declare the solution Infeasible / Not a BFS."
    },
    {
        "id": "intel_sep7_penalty_bigm",
        "module_id": "module_sep7",
        "folder": "September 7",
        "lecture_date": "September 7, 2026",
        "time_sec": 3950,
        "time_str": "01:05:50",
        "category": "rules",
        "category_label": "Formulation Technique",
        "severity": "info",
        "title": "Big-M Method: Penalty Assignment for >= and = Constraints",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "We will now introduce a penalty... This is what you call we're introducing a penalty, Big-M... yung penalty naman wala ng penalty pag standard na.",
        "summary": "When converting LP to standard form, artificial variables added to >= or = constraints must receive a huge penalty coefficient (-M for Max, +M for Min) in row 0.",
        "action_rule": "Remember Big-M signs: Subtract M * A_i for Maximization; Add M * A_i for Minimization. Row 0 must be priced out before starting iteration 1."
    },
    {
        "id": "intel_sep7_origin_geometry",
        "module_id": "module_sep7",
        "folder": "September 7",
        "lecture_date": "September 7, 2026",
        "time_sec": 44,
        "time_str": "00:00:44",
        "category": "theory",
        "category_label": "Core Simplex Concept",
        "severity": "info",
        "title": "Simplex Geometric Trajectory: Origin Start & Adjacent Extreme Points",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Examining axis directions, the simplex algorithm is verifying whether the origin is optimal. So that means the simplex algorithm always starts with the origin... it will move to an adjacent or next door feasible solution.",
        "summary": "Conceptual exam question: Simplex initializes at the origin (when all slacks are basic), evaluates adjacent edge directions via reduced costs (zj - cj), and hops from vertex to adjacent vertex.",
        "action_rule": "If asked about the geometric nature of the simplex method, state that it evaluates adjacent extreme points (vertices) along boundary edges until no edge direction yields an improvement in Z."
    },
    {
        "id": "intel_oct5_duality_bounds",
        "module_id": "module_oct5",
        "folder": "October 5",
        "lecture_date": "October 5, 2026",
        "time_sec": 3550,
        "time_str": "00:59:10",
        "category": "theory",
        "category_label": "Duality & Optimality Proof",
        "severity": "critical",
        "title": "Duality Squeezing: Primal Lower Bound & Dual Upper Bound Optimality Proof",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Ang purpose nito is to show the concept of weak and strong duality... Z is the lower bound, W is the upper bound. As you iterate they squeeze closer together. Kapag Z* = W*, that is the mathematical proof of optimality.",
        "summary": "Prof. Lorenzo demonstrates that every primal feasible solution gives a lower bound Z <= Z*, and every dual feasible solution gives an upper bound W >= W*. When Z = W, the gap closes and optimality is proven.",
        "action_rule": "On the midterm exam, if asked how to verify whether an LP candidate solution is globally optimal without running all simplex iterations, calculate its dual objective value W. If c^T x = b^T y and both are feasible, Strong Duality guarantees optimality."
    },
    {
        "id": "intel_oct5_shadow_price_range",
        "module_id": "module_oct5",
        "folder": "October 5",
        "lecture_date": "October 5, 2026",
        "time_sec": 3930,
        "time_str": "01:05:30",
        "category": "traps",
        "category_label": "Common Pitfall / Trap",
        "severity": "critical",
        "title": "Shadow Price Trap: Validity Only Holds Within the Allowable RHS Range",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Do not simply multiply the shadow price by Delta b_i without checking if it falls within the allowable increase or decrease. If the change pushes any basic variable below zero, the current basis is destroyed and you must pivot using Dual Simplex!",
        "summary": "Exam pitfall: students often blindly calculate new Z = Z_old + (shadow_price * Delta b) even when the resource change exceeds the allowable range, rendering the basis infeasible.",
        "action_rule": "Always compute B^-1 (b + Delta b) to confirm basic feasibility (all x_B >= 0) before using shadow prices to predict objective changes."
    },
    {
        "id": "intel_oct5_midterm_preparation",
        "module_id": "module_oct5",
        "folder": "October 5",
        "lecture_date": "October 5, 2026",
        "time_sec": 5880,
        "time_str": "01:38:00",
        "category": "exam_prep",
        "category_label": "Midterm Exam Master Strategy",
        "severity": "warning",
        "title": "Midterm Exam Directives: Precise Units in Definitions & Clean Simplex Pivoting",
        "speaker": "Prof. Lowell Lorenzo",
        "quote": "Review the formulation exercises thoroughly. Know your variable definitions with units and decisions. Master one iteration of simplex pivoting, including the tie-breaking rule. Understand duality relationships and sensitivity interpretations.",
        "summary": "Prof. Lorenzo provides the exact roadmap for the October 10 Midterm: 1) Formulate problems with complete variable units, 2) Execute 1-2 simplex pivots manually with Bland's rule / tie-breaker, and 3) Interpret duality and sensitivity tableaus.",
        "action_rule": "In every exam formulation, write: 'Let x_j = [quantity] of [item] per [time unit]'. When pivoting, explicitly write down the minimum ratio calculations to earn full partial credit."
    }
]