"""
knowledge_base.py - Comprehensive Knowledge Base for IE 214 Introductory Operations Research
Compiled and grounded directly in the transcripts of Prof. Lowell Lorenzo's graduate lectures
at the University of the Philippines Diliman (MEngAI Program).
"""

from typing import Dict, List, Any, Optional

KNOWLEDGE_BASE_DATA: List[Dict[str, Any]] = [
    {
        "module_id": "module_aug10",
        "folder": "August 10",
        "lecture_date": "August 10, 2026",
        "title": "Operations Research Foundations & Methodology",
        "topic": "IE/OR Philosophy, Management Functions, Analytics Spectrum & LP Origins",
        "duration_min": 74.9,
        "executive_summary": (
            "Professor Lowell Lorenzo introduces the core philosophy of Industrial Engineering (IE) and "
            "Operations Research (OR) at UP Diliman. The lecture bridges management functions with quantitative "
            "optimization, differentiates the analytics spectrum, formalizes the 5-step OR scientific methodology, "
            "and traces the birth of Linear Programming from Kantorovich and Koopmans' 1975 Nobel prize-winning economic models."
        ),
        "core_concepts": [
            {
                "term": "Operations Research (OR)",
                "category": "Foundations",
                "definition": "The scientific approach to decision making that seeks to design and operate systems under constrained resources, maximizing effectiveness or minimizing cost through mathematical modeling.",
                "timestamp": "00:25:00",
                "time_sec": 1500
            },
            {
                "term": "5 Management Functions (POSDC)",
                "category": "Management Science",
                "definition": "Planning, Organizing, Staffing, Directing, and Controlling. OR primarily empowers the Planning (optimal decision modeling) and Controlling (variance monitoring and corrective action) phases.",
                "timestamp": "00:16:30",
                "time_sec": 990
            },
            {
                "term": "Analytics Spectrum",
                "category": "Data Science & OR",
                "definition": "1) Descriptive Analytics (What happened?), 2) Predictive Analytics (What will happen?), and 3) Prescriptive / Normative Analytics (What should we do? - Domain of Operations Research & Mathematical Programming).",
                "timestamp": "00:34:00",
                "time_sec": 2040
            },
            {
                "term": "Parameters vs Decision Variables",
                "category": "Formulation",
                "definition": "Parameters describe known operational facts (resource capacities, unit profits, technological rates). Decision variables represent controllable choices that the decision maker seeks to determine.",
                "timestamp": "01:02:00",
                "time_sec": 3720
            }
        ],
        "mathematical_models": [
            {
                "name": "General Scalar Linear Programming Formulation",
                "latex": r"""\begin{aligned}
\text{Maximize or Minimize } & Z = \sum_{j=1}^{n} c_j x_j \\
\text{subject to: } & \sum_{j=1}^{n} a_{ij} x_j \le (\text{or } =, \ge) \, b_i, \quad i = 1, \dots, m \\
& x_j \ge 0, \quad j = 1, \dots, n
\end{aligned}""",
                "explanation": "Where $x_j$ are decision variables, $c_j$ are objective coefficients (profit/cost), $a_{ij}$ are technological coefficients, and $b_i$ are right-hand-side resource limits."
            }
        ],
        "algorithms_and_steps": [
            {
                "name": "The 5-Step Operations Research Methodology",
                "steps": [
                    "Step 1: Problem Definition & Scope - Define objectives, limitations, controllable variables, and system boundaries.",
                    "Step 2: Mathematical Model Construction - Translate real-world physical relationships into an objective function and constraint set.",
                    "Step 3: Deriving Model Solutions - Select suitable analytical, exact algorithmic (Simplex, Branch & Bound), or heuristic methods.",
                    "Step 4: Model Testing & Validation - Verify mathematical consistency, parameter sensitivity, and historical validity.",
                    "Step 5: Implementation & Maintenance - Operationalize the solution, establish monitoring controls, and adapt as parameters shift."
                ],
                "notes": "Prof. Lorenzo emphasizes that real-world problems never arrive as clean word problems; parameters must often be audited and estimated by the analyst."
            }
        ],
        "classroom_discussions": [
            {
                "topic": "Goods vs Services Transformation",
                "student_question": "Why does Industrial Engineering apply to banks, hospitals, and software teams if they don't manufacture physical goods?",
                "professor_answer": "Every organization transforms inputs into outputs. In services, the transformation deals with information, customer states, or capital rather than physical raw materials, but resource constraints (time, personnel, budgets) remain identical.",
                "timestamp": "00:08:30",
                "time_sec": 510
            }
        ],
        "exam_watchpoints": [
            {
                "title": "Parameter vs Unknown Distinction",
                "warning": "Never declare fixed costs, known resource capacities, or given demand as decision variables.",
                "rule": "Only controllable quantities that the solver must choose should be indexed as decision variables $x_j$.",
                "timestamp": "01:02:40",
                "time_sec": 3760
            }
        ]
    },
    {
        "module_id": "module_aug17",
        "folder": "August 17",
        "lecture_date": "August 17, 2026",
        "title": "LP Modeling Assumptions, 2D Graphical Geometry & Standard Form",
        "topic": "Core LP Axioms, Graphical Feasible Region, Extreme Points & Standard Canonical Form",
        "duration_min": 169.0,
        "executive_summary": (
            "An exhaustive 2.8-hour lecture covering the 4 fundamental mathematical assumptions of linear programming, "
            "the 2D graphical solution geometry in Euclidean space $\\mathbb{R}^2$, identification of extreme corner points, "
            "and conversion of inequality systems into standard canonical form using slack ($s_i$) and surplus ($e_i$) variables."
        ),
        "core_concepts": [
            {
                "term": "4 Core Assumptions of Linear Programming",
                "category": "Theory",
                "definition": "1) Proportionality (each variable's contribution is strictly proportional to its value), 2) Additivity (no interaction or cross-product terms $x_1 x_2$), 3) Divisibility (variables can take continuous fractional values), 4) Certainty (all coefficients $c_j, a_{ij}, b_i$ are deterministic constants).",
                "timestamp": "00:45:00",
                "time_sec": 2700
            },
            {
                "term": "Fundamental Theorem of Linear Programming",
                "category": "Optimization Geometry",
                "definition": "If a linear program has an optimal solution, at least one optimal solution occurs at an extreme point (vertex/corner) of the convex feasible polyhedron.",
                "timestamp": "01:45:20",
                "time_sec": 6320
            },
            {
                "term": "Standard Form (Matrix Representation)",
                "category": "Algebra",
                "definition": "A linear program where all constraints are expressed as equations ($A \\mathbf{x} = \\mathbf{b}$), all right-hand sides are non-negative ($b_i \\ge 0$), and all variables are non-negative ($\\mathbf{x} \\ge 0$).",
                "timestamp": "02:10:00",
                "time_sec": 7800
            },
            {
                "term": "Basic Solution & Basic Feasible Solution (BFS)",
                "category": "Algebra",
                "definition": "For a system of $m$ equations with $n$ variables ($n > m$), setting $n - m$ non-basic variables to 0 and solving for the $m$ basic variables yields a Basic Solution. If all basic variables satisfy $x_{Bi} \\ge 0$, it is a Basic Feasible Solution (BFS).",
                "timestamp": "02:22:15",
                "time_sec": 8535
            }
        ],
        "mathematical_models": [
            {
                "name": "Standard Matrix LP Formulation",
                "latex": r"""\begin{aligned}
\text{Maximize } & Z = \mathbf{c}^T \mathbf{x} \\
\text{subject to: } & A \mathbf{x} = \mathbf{b} \\
& \mathbf{x} \ge \mathbf{0}, \quad \mathbf{b} \ge \mathbf{0}
\end{aligned}""",
                "explanation": "Inequalities $\\le$ are converted by adding slack variables $s_i \\ge 0$; $\\ge$ inequalities are converted by subtracting surplus variables $e_i \\ge 0$."
            }
        ],
        "algorithms_and_steps": [
            {
                "name": "2D Graphical Solution Procedure",
                "steps": [
                    "Step 1: Treat each inequality constraint as an equation and plot the straight line boundary on the Cartesian plane.",
                    "Step 2: Use a test point (such as the origin $(0,0)$) to determine the valid half-space for each constraint.",
                    "Step 3: Identify the intersection of all half-spaces to obtain the Feasible Region (convex polygon).",
                    "Step 4: Plot the objective line $c_1 x_1 + c_2 x_2 = Z_0$ for an arbitrary value $Z_0$.",
                    "Step 5: Shift the isoprofit/isocost line parallel to itself in the direction of improvement until the last contact point with the feasible region is reached."
                ],
                "notes": "Always check for bounded vs unbounded regions. If the feasible region extends infinitely in the direction of optimization, the problem may be unbounded."
            }
        ],
        "classroom_discussions": [
            {
                "topic": "Use of AI / LLMs vs Exam Reality",
                "student_question": "Can we use LLMs like ChatGPT or solvers to do formulations in class?",
                "professor_answer": "You may use AI as a study supplement to understand nuances, but do not become dependent. In the proctored exam, you will not have an LLM or computer; you must formulate from first principles.",
                "timestamp": "02:41:30",
                "time_sec": 9690
            },
            {
                "topic": "Exam Calculation Load",
                "student_question": "Will we perform massive manual Gauss-Jordan reductions in the midterm?",
                "professor_answer": "Calculations in the exam are very minimal. You are evaluated on conceptual understanding and setting up models, not on acting as human calculators.",
                "timestamp": "02:43:13",
                "time_sec": 9793
            }
        ],
        "exam_watchpoints": [
            {
                "title": "Strict 2-Hour Midterm Exam Time Limit",
                "warning": "You will be given a real-world formulation problem designed to fit tightly inside the 2-hour examination window.",
                "rule": "Practice translating scenario requirements directly into variables and constraints within 25 minutes.",
                "timestamp": "02:35:30",
                "time_sec": 9330
            }
        ]
    },
    {
        "module_id": "module_aug24",
        "folder": "August 24",
        "lecture_date": "August 24, 2026",
        "title": "Simplex Algorithm Foundations & Variable Definition Rules",
        "topic": "Standard Tableau, Pricing Out, Minimum Ratio Test & Professor's Grading Rubric",
        "duration_min": 140.0,
        "executive_summary": (
            "A pivotal session covering the algebraic mechanics of the Simplex method. Prof. Lorenzo explains "
            "canonical forms, Row 0 reduced costs ($z_j - c_j$), entering variable selection, minimum ratio test "
            "for leaving variables, and Gauss-Jordan pivoting. Crucially, the professor reveals his strict classroom "
            "grading rubric for defining decision variables, emphasizing heavy deductions for missing units or actions."
        ),
        "core_concepts": [
            {
                "term": "Two Mandatory Attributes of Decision Variables",
                "category": "Grading Rubric",
                "definition": "1) Unit of Measurement (UOM) (e.g. meters, tons per day, hours), and 2) Specific Decision Action (e.g. 'coordinate where AMR base is placed'). Defining variables without both causes a 30-40% point loss.",
                "timestamp": "00:18:45",
                "time_sec": 1125
            },
            {
                "term": "Row 0 Reduced Cost (z_j - c_j)",
                "category": "Simplex Algebra",
                "definition": "The net rate of improvement in objective value $Z$ per unit increase in non-basic variable $x_j$. For Maximization, a negative value ($z_j - c_j < 0$) indicates that bringing $x_j$ into the basis will increase $Z$.",
                "timestamp": "01:15:30",
                "time_sec": 4530
            },
            {
                "term": "Minimum Ratio Test (Theta Rule)",
                "category": "Simplex Mechanics",
                "definition": "Determines how much an entering variable can increase before the first basic variable hits zero: $\\theta = \\min_{i: y_{ik} > 0} \\{ x_{Bi} / y_{ik} \\}$. Enforces feasibility ($x_j \\ge 0$).",
                "timestamp": "01:35:00",
                "time_sec": 5700
            },
            {
                "term": "Simplex Iteration Limit in Exam",
                "category": "Exam Scope",
                "definition": "Students will be asked to perform at most ONE iteration on the exam to demonstrate algorithmic understanding, because repetitious arithmetic is unnecessary.",
                "timestamp": "02:06:48",
                "time_sec": 7608
            }
        ],
        "mathematical_models": [
            {
                "name": "Simplex Tableau Canonical Matrix Layout",
                "latex": r"""\begin{array}{|c|c|cccc|c|}
\hline
\text{Basic} & Z & x_1 & \dots & x_n & \dots & \text{RHS} \\
\hline
Z & 1 & z_1 - c_1 & \dots & z_n - c_n & \dots & \mathbf{c}_B^T B^{-1} \mathbf{b} \\
\hline
x_{B1} & 0 & y_{11} & \dots & y_{1n} & \dots & (B^{-1} \mathbf{b})_1 \\
\vdots & \vdots & \vdots & \ddots & \vdots & \ddots & \vdots \\
x_{Bm} & 0 & y_{m1} & \dots & y_{mn} & \dots & (B^{-1} \mathbf{b})_m \\
\hline
\end{array}""",
                "explanation": "Where $B$ is the current basis matrix, $y_{ik} = (B^{-1} A)_k$ is the updated constraint column, and RHS represents current values of basic variables."
            }
        ],
        "algorithms_and_steps": [
            {
                "name": "Standard Simplex Iteration Procedure (Maximization)",
                "steps": [
                    "Step 1: Check Optimality - Inspect Row 0 ($z_j - c_j$). If all non-basic coefficients are $\\ge 0$, current tableau is OPTIMAL. Stop.",
                    "Step 2: Choose Entering Variable - Select variable $x_k$ with the most negative Row 0 coefficient (steepest descent in reduced cost). Tie-breaker: choose smaller index.",
                    "Step 3: Choose Leaving Variable - Compute ratio $\\theta_i = \\text{RHS}_i / y_{ik}$ strictly for strictly positive column entries $y_{ik} > 0$. Select row $r$ with minimum ratio. Tie-breaker: choose smaller index.",
                    "Step 4: Execute Gauss-Jordan Pivot - Divide pivot row $r$ by pivot element $y_{rk}$ so pivot entry becomes 1. Perform row operations $R_i' = R_i - y_{ik} R_r'$ to eliminate $x_k$ from all other rows (including Row 0)."
                ],
                "notes": "Coefficients in Row 0 under current basic variables must always remain identically 0."
            }
        ],
        "classroom_discussions": [
            {
                "topic": "Decision Variable Definition Flaws",
                "student_question": "Martin defined variables as: 'x1 and x2 are the coordinates.' Will that receive full points?",
                "professor_answer": "No. It will get 6 or 7 out of 10 points. You must specify the Unit of Measurement (e.g., meters) and the specific decision being made (e.g., coordinate where the AMR home base station is to be positioned).",
                "timestamp": "00:18:05",
                "time_sec": 1085
            }
        ],
        "exam_watchpoints": [
            {
                "title": "Mandatory 2-Attribute Variable Rubric",
                "warning": "Writing vague variable names like '$x_1$: location' incurs an instant 30-40% penalty on the problem definition section.",
                "rule": "Always explicitly write: '$x_j$ = [Action/Quantity] of [Item/Facility] measured in [Unit of Measurement]'.",
                "timestamp": "00:19:40",
                "time_sec": 1180
            }
        ]
    },
    {
        "module_id": "module_sep7",
        "folder": "September 7",
        "lecture_date": "September 7, 2026",
        "title": "Simplex Special Cases, Big-M Method & Tableau Algebra",
        "topic": "Big-M Penalty Method, Unbounded Rays, Infeasibility & Degeneracy",
        "duration_min": 107.0,
        "executive_summary": (
            "Examines initialization challenges and pathological conditions in linear programming. Covers the Big-M "
            "penalty method for constraints with $\\ge$ and $=$ signs, detection of infeasible systems, identification of "
            "unbounded solutions via non-positive pivot columns, and geometric handling of alternative optimal solutions."
        ),
        "core_concepts": [
            {
                "term": "Artificial Variables (A_i)",
                "category": "Methodology",
                "definition": "Fictitious variables added to $\\ge$ (after subtracting surplus $e_i$) or $=$ constraints to form an immediate starting identity basis matrix ($I$). They have no physical meaning and must be driven to zero.",
                "timestamp": "01:05:50",
                "time_sec": 3950
            },
            {
                "term": "Big-M Penalty Concept",
                "category": "Methodology",
                "definition": "Assigning a gigantic penalty coefficient $-M$ (for Max) or $+M$ (for Min) to artificial variables in the objective function so that any strictly positive $A_i > 0$ makes $Z$ uncompetitively poor.",
                "timestamp": "01:06:55",
                "time_sec": 4015
            },
            {
                "term": "Unbounded Solution Condition",
                "category": "Special Cases",
                "definition": "Occurs when an entering variable $x_k$ has no positive technological coefficients in its pivot column ($y_{ik} \\le 0$ for all $i$). The minimum ratio test cannot be computed, and $x_k$ can increase indefinitely without violating any constraint.",
                "timestamp": "00:38:12",
                "time_sec": 2292
            },
            {
                "term": "Infeasible Solution Detection",
                "category": "Special Cases",
                "definition": "If the Simplex stopping criterion is met (all $z_j - c_j \\ge 0$) but at least one artificial variable remains in the basis with a strictly positive value ($A_i > 0$), no feasible region exists for the original LP.",
                "timestamp": "01:14:08",
                "time_sec": 4448
            }
        ],
        "mathematical_models": [
            {
                "name": "Big-M Objective Function Structure",
                "latex": r"""\begin{aligned}
\text{Maximize } & Z = \sum_{j=1}^{n} c_j x_j - M \sum_{i=1}^{m} A_i \\
\text{Minimize } & W = \sum_{j=1}^{n} c_j x_j + M \sum_{i=1}^{m} A_i
\end{aligned}""",
                "explanation": r"Before starting simplex iterations, Row 0 must be 'priced out' by substituting $A_i = b_i - \sum a_{ij} x_j$ to eliminate $M$ from the columns of basic artificial variables."
            }
        ],
        "algorithms_and_steps": [
            {
                "name": "Big-M Initialization Procedure",
                "steps": [
                    "Step 1: Express all constraints in standard form ($b_i \\ge 0$).",
                    "Step 2: Add slack $s_i \\ge 0$ to $\\le$ constraints. Subtract surplus $e_i \\ge 0$ and add artificial $A_i \\ge 0$ to $\\ge$ constraints. Add artificial $A_i \\ge 0$ to $=$ constraints.",
                    "Step 3: Formulate objective with $-M A_i$ (for Max) or $+M A_i$ (for Min).",
                    "Step 4: Price out Row 0: Row 0 = (Original Row 0) + M * (sum of rows containing artificial variables).",
                    "Step 5: Apply standard Simplex algorithm until optimal or unbounded."
                ],
                "notes": "If $A_i$ leaves the basis during any pivot, its column can be dropped from subsequent tableaus to save computation."
            }
        ],
        "classroom_discussions": [
            {
                "topic": "Simplex Edge Walking Trajectory",
                "student_question": "Does Simplex test every corner point inside the polyhedron?",
                "professor_answer": "No. Simplex begins at the origin (when slacks are basic) and only examines adjacent extreme points by testing axis edge directions. It strictly travels along boundary edges that improve the objective function.",
                "timestamp": "00:00:44",
                "time_sec": 44
            }
        ],
        "exam_watchpoints": [
            {
                "title": "Pricing Out Row 0 Penalty",
                "warning": "Forgetting to price out $A_i$ before running iteration 1 will cause the wrong entering variable to be selected.",
                "rule": "Always eliminate artificial variable entries in Row 0 using algebraic row substitution before computing entering variable ratios.",
                "timestamp": "01:18:34",
                "time_sec": 4714
            }
        ]
    },
    {
        "module_id": "module_sep14",
        "folder": "September 14",
        "lecture_date": "September 14, 2026",
        "title": "Duality Theory, Shadow Prices & Midterm Problem Analysis",
        "topic": "Primal-Dual Relationships, Weak/Strong Duality, Complementary Slackness & Midterm Indicative Handouts",
        "duration_min": 135.0,
        "executive_summary": (
            "One of the most consequential lectures of the semester. Prof. Lorenzo confirms that the handout exercises "
            "in Exercises/ are actual past midterm questions. He establishes the mandatory classroom tie-breaking rule "
            "for Simplex grading, explains the mathematical necessity of convex combinations for alternative optima, "
            "and formalizes the foundational theorems of Linear Programming Duality Theory."
        ),
        "core_concepts": [
            {
                "term": "Mandatory Exam Tie-Breaking Rule",
                "category": "Exam Rule",
                "definition": "Whenever there is a tie for the entering variable ($z_j - c_j$) or the leaving variable (minimum ratio $\\theta$), students MUST choose the variable with the smaller subscript index ($x_1$ over $x_2$, $x_3$ over $x_4$). Choosing otherwise will be marked INCORRECT in the exam to ensure standardized grading.",
                "timestamp": "01:21:20",
                "time_sec": 4880
            },
            {
                "term": "Alternative Optima Convex Combination",
                "category": "Exam Format",
                "definition": "When an LP possesses alternative optima (non-basic variable with $z_j - c_j = 0$ in the optimal tableau), the complete solution is NOT just the corner points. It is the infinite set of points along the line segment given by the convex combination $\\mathbf{x}^* = \\alpha \\mathbf{x}_B + (1 - \\alpha) \\mathbf{x}_C$ for $0 \\le \\alpha \\le 1$.",
                "timestamp": "01:44:15",
                "time_sec": 6255
            },
            {
                "term": "Shadow Price (Dual Variable w_i)",
                "category": "Economic Interpretation",
                "definition": "The marginal change in optimal objective value $Z^*$ per unit increase in the right-hand-side resource limit $b_i$, valid within the allowable sensitivity range: $w_i^* = \\frac{\\partial Z^*}{\\partial b_i}$.",
                "timestamp": "00:48:00",
                "time_sec": 2880
            },
            {
                "term": "Infeasible Basic Solution vs BFS",
                "category": "Pitfall",
                "definition": "A basic solution where any basic variable has a negative component ($x_{Bi} < 0$) violates non-negativity $x_j \\ge 0$. It is Infeasible and cannot be considered a BFS or evaluated for optimality.",
                "timestamp": "01:01:32",
                "time_sec": 3692
            }
        ],
        "mathematical_models": [
            {
                "name": "Primal-Dual Symmetry (Symmetric Form)",
                "latex": r"""\begin{aligned}
\textbf{Primal Problem (Max):} \quad & \text{Maximize } Z = \mathbf{c}^T \mathbf{x} \\
& \text{subject to } A \mathbf{x} \le \mathbf{b}, \quad \mathbf{x} \ge \mathbf{0} \\[1em]
\textbf{Dual Problem (Min):} \quad & \text{Minimize } W = \mathbf{b}^T \mathbf{w} \\
& \text{subject to } A^T \mathbf{w} \ge \mathbf{c}, \quad \mathbf{w} \ge \mathbf{0}
\end{aligned}""",
                "explanation": "Every primal parameter maps into the dual: primal constraints become dual variables, primal objective coefficients become dual RHS values."
            },
            {
                "name": "Duality Theorems",
                "latex": r"""\begin{aligned}
\text{Weak Duality: } & \mathbf{c}^T \mathbf{x} \le \mathbf{b}^T \mathbf{w} \quad \text{for all feasible } \mathbf{x}, \mathbf{w} \\
\text{Strong Duality: } & Z^* = \mathbf{c}^T \mathbf{x}^* = \mathbf{b}^T \mathbf{w}^* = W^* \quad \text{at optimality} \\
\text{Complementary Slackness: } & w_i (b_i - A_i \mathbf{x}) = 0 \quad \text{and} \quad x_j (A_j^T \mathbf{w} - c_j) = 0
\end{aligned}""",
                "explanation": r"If a primal constraint has positive slack ($b_i - A_i \mathbf{x} > 0$), its dual shadow price must be 0 ($w_i = 0$)."
            }
        ],
        "algorithms_and_steps": [
            {
                "name": "Primal-to-Dual Conversion Algorithm (The SOB Rule)",
                "steps": [
                    "Step 1: Check Primal Direction - If Max, Dual is Min. If Min, Dual is Max.",
                    "Step 2: Assign Dual Variables - Create one dual variable $w_i$ for each primal constraint $i = 1, \\dots, m$.",
                    "Step 3: Construct Dual Objective - Objective coefficients of Dual are the RHS constants $\\mathbf{b}$ of the Primal.",
                    "Step 4: Transpose Constraint Matrix - Coefficients of $w_i$ in dual constraint $j$ are the column coefficients of $x_j$ in the primal ($A^T$).",
                    "Step 5: Determine Inequality Signs - For Primal Max: $\\le$ constraint $\\leftrightarrow w_i \\ge 0$; $\\ge$ constraint $\\leftrightarrow w_i \\le 0$; $=$ constraint $\\leftrightarrow w_i$ is unrestricted in sign (URS).",
                    "Step 6: Determine Variable Restrictions - For Primal variable $x_j \\ge 0 \\leftrightarrow j$-th Dual constraint is $\\ge$ (for Min); $x_j$ URS $\\leftrightarrow j$-th Dual constraint is $=$."
                ],
                "notes": "Always verify that dimensions match: an $(m \\times n)$ Primal produces an $(n \\times m)$ Dual."
            }
        ],
        "classroom_discussions": [
            {
                "topic": "Handout Exercises are Midterm Exam Problems",
                "student_question": "Are the exercises assigned in Google Drive past exam problems?",
                "professor_answer": "These exercises are very indicative of what you will expect in the midterm. I want you to do these exercises because they show you more or less what will be assigned or given in the midterm exam.",
                "timestamp": "00:05:29",
                "time_sec": 329
            },
            {
                "topic": "Complete Optimal Solution Format",
                "student_question": "If there are alternative optima, can we just answer Point B and Point C?",
                "professor_answer": "No. Point B and Point C are just the two extreme points. The complete optimal solution includes every single point on segment BC. You must give the convex combination: x = t B + (1-t) C for 0 <= t <= 1.",
                "timestamp": "01:44:47",
                "time_sec": 6287
            }
        ],
        "exam_watchpoints": [
            {
                "title": "Mandatory Smaller-Index Tie-Breaking Rule",
                "warning": "Choosing a larger index during ties (e.g. $x_4$ instead of $x_3$) produces an alternate pivoting branch that will be marked INCORRECT in paper grading.",
                "rule": "Always break ties in Row 0 or Minimum Ratio by choosing the candidate with the smaller subscript index.",
                "timestamp": "01:21:27",
                "time_sec": 4887
            }
        ]
    },
    {
        "module_id": "module_oct5",
        "folder": "October 5",
        "lecture_date": "October 5, 2026",
        "title": "Duality Bounds, Sensitivity Analysis & Midterm Exam Review",
        "topic": "Weak/Strong Duality Squeezing, Shadow Prices, RHS/Objective Ranging, Midterm Exam Scope",
        "duration_min": 114.5,
        "executive_summary": (
            "The final lecture before the October 10 Midterm Exam. Professor Lowell Lorenzo explores the bound-squeezing "
            "mechanics of Weak and Strong Duality, demonstrating that Primal objective values provide a lower bound and Dual "
            "objective values provide an upper bound until $Z^* = W^*$. Covers sensitivity analysis for RHS variations ($b_i$) "
            "and objective coefficient changes ($c_j$), followed by an intensive breakdown of the midterm exam."
        ),
        "core_concepts": [
            {
                "term": "Dual Squeezing Phenomenon",
                "category": "Duality Theory",
                "definition": "For any feasible pair $(\\mathbf{x}, \\mathbf{w})$, $Z(\\mathbf{x}) \\le W(\\mathbf{w})$. As iterations progress, primal values increase while dual values decrease, 'squeezing' the gap until $Z^* = W^*$ at optimality.",
                "timestamp": "00:02:17",
                "time_sec": 137
            },
            {
                "term": "Allowable Range for Objective Coefficients (c_j)",
                "category": "Sensitivity Analysis",
                "definition": "The interval $[c_j - \\Delta^-, c_j + \\Delta^+]$ over which an objective coefficient can vary without changing the optimal basic variables (though the optimal value $Z^*$ will change).",
                "timestamp": "00:42:15",
                "time_sec": 2535
            },
            {
                "term": "Allowable Range for Resource Limits (b_i)",
                "category": "Sensitivity Analysis",
                "definition": "The interval $[b_i - \\Delta^-, b_i + \\Delta^+]$ over which resource $b_i$ can vary without changing the current basis matrix $B$ (though the numerical values of basic variables $\\mathbf{x}_B = B^{-1} \\mathbf{b}$ will change). Within this range, the shadow price $w_i^*$ remains constant.",
                "timestamp": "00:58:30",
                "time_sec": 3510
            },
            {
                "term": "100% Rule for Simultaneous Changes",
                "category": "Sensitivity Analysis",
                "definition": "A conservative test for simultaneous parameter variations: if the sum of percentage changes relative to their maximum allowable limits does not exceed 100%, the current basis remains optimal.",
                "timestamp": "01:12:00",
                "time_sec": 4320
            }
        ],
        "mathematical_models": [
            {
                "name": "Post-Optimality Objective Ranging Formula",
                "latex": r"""\Delta c_j \text{ condition: } \quad (\mathbf{c}_B + \Delta \mathbf{c}_B)^T B^{-1} A_k - (c_k + \Delta c_k) \ge 0 \quad \forall k \notin B""",
                "explanation": "For non-basic variable $x_k$, its reduced cost increases directly by $-\\Delta c_k$. For basic variable $x_B$, changing its coefficient alters all Row 0 coefficients through the basis weight vector $\\mathbf{c}_B^T B^{-1}$."
            },
            {
                "name": "RHS Variation and Optimal Objective Impact",
                "latex": r"""Z_{\text{new}}^* = Z_{\text{old}}^* + \sum_{i=1}^{m} w_i^* \Delta b_i \quad \text{provided } B^{-1} (\mathbf{b} + \Delta \mathbf{b}) \ge \mathbf{0}""",
                "explanation": "The change in optimal objective is linearly predicted by the shadow prices $w_i^*$, provided feasibility $\\mathbf{x}_B \\ge 0$ is preserved."
            }
        ],
        "algorithms_and_steps": [
            {
                "name": "Sensitivity Analysis Calculation Steps",
                "steps": [
                    "Step 1: Extract the final optimal basis matrix inverse $B^{-1}$ from the slack/identity columns of the optimal tableau.",
                    "Step 2: To test a non-basic change $\\Delta c_j$: check if $z_j - c_j - \\Delta c_j \\ge 0$. The allowable increase is $\\Delta c_j \\le z_j - c_j$.",
                    "Step 3: To test a basic change $\\Delta c_{Bk}$: update $\\mathbf{c}_B^T B^{-1}$ and re-evaluate reduced costs for all non-basic columns.",
                    "Step 4: To test RHS change $\\Delta b_i$: compute new basic solution $\\mathbf{x}_B = B^{-1} (\\mathbf{b} + \\Delta b_i \\mathbf{e}_i)$. Enforce $\\mathbf{x}_B \\ge \\mathbf{0}$ to find lower and upper allowable limits.",
                    "Step 5: If within limits, calculate new objective $Z^* = Z_0^* + w_i^* \\Delta b_i$."
                ],
                "notes": "If $\\mathbf{x}_B$ becomes negative, the current basis is infeasible and the Dual Simplex method must be applied."
            }
        ],
        "classroom_discussions": [
            {
                "topic": "Dual Bound Squeezing Mechanism",
                "student_question": "How do we know when the algorithm has reached the true global optimum?",
                "professor_answer": "Primal provides a lower bound and Dual provides an upper bound. They squeeze the gap between them. When Z is equal to W, meaning Z* = W*, that is the mathematical proof of optimality.",
                "timestamp": "00:02:45",
                "time_sec": 165
            },
            {
                "topic": "Midterm Exam Preparation Advice",
                "student_question": "What is the best way to spend the remaining days before the October 10 Midterm?",
                "professor_answer": "Review the formulation exercises thoroughly. Know your variable definitions with units and decisions. Master one iteration of simplex pivoting, including the tie-breaking rule. Understand duality relationships and sensitivity interpretations.",
                "timestamp": "01:38:00",
                "time_sec": 5880
            }
        ],
        "exam_watchpoints": [
            {
                "title": "Shadow Price Validity Range Limit",
                "warning": "Shadow prices CANNOT be multiplied by $\\Delta b_i$ if the resource change pushes any basic variable below zero ($B^{-1} \\mathbf{b} < 0$).",
                "rule": "Always check whether $\\Delta b_i$ falls within the allowable range before using $Z^* + w_i \\Delta b_i$.",
                "timestamp": "01:05:30",
                "time_sec": 3930
            }
        ]
    }
]

def get_all_knowledge_base() -> List[Dict[str, Any]]:
    return KNOWLEDGE_BASE_DATA

def get_module_knowledge_base(module_id: str) -> Optional[Dict[str, Any]]:
    return next((m for m in KNOWLEDGE_BASE_DATA if m["module_id"] == module_id or m["folder"].lower() == module_id.lower()), None)
