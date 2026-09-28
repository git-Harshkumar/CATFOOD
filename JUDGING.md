# DOGFOOD 2026: Judging Engine & Mathematical Normalization Proof

## 1. Overview

The DOGFOOD judging engine is engineered to solve the fundamental challenge of hackathon evaluation: **subjective bias and asymmetric workload distribution across judges**. 

In real-world hackathons:
1. Some judges are consistently harsh (giving average scores of 2/5), while others are exceptionally generous (giving 4.8/5).
2. Some judges display zero variance (giving identical scores to all assigned projects).
3. Review workloads are asymmetric—some projects receive 3 reviews, others 5, and some judges leave review batches unfinished.

Our platform implements two complementary judging mechanisms:
- **Server-Authoritative Weighted Rubric Scoring** with **Cross-Judge Z-Score Normalization**.
- **Pairwise Comparison Mode** powered by the **Bradley-Terry Maximum Likelihood Estimator** (Hunter's MM algorithm).

---

## 2. Weighted Rubric Calculation

Each hackathon event defines an arbitrary set of evaluation criteria $C = \{c_1, c_2, \dots, c_K\}$, where each criterion $c_k$ specifies:
- $M_k \in \mathbb{R}^+$: Maximum possible raw score (e.g. 5 or 10).
- $w_k \in \mathbb{R}^+$: Criterion weight.

For submission $i$ evaluated by judge $j$, the raw criterion score is $s_{ijk} \in [0, M_k]$.
The total weighted score $S_{ij}$ and maximum attainable score $S_i^{\text{max}}$ are calculated strictly server-side:

$$S_{ij} = \sum_{k=1}^K w_k \cdot s_{ijk}$$

$$S_i^{\text{max}} = \sum_{k=1}^K w_k \cdot M_k$$

The standardized percentage score $x_{ij} \in [0, 10]$ on a 10-point scale is:

$$x_{ij} = \frac{S_{ij}}{S_i^{\text{max}}} \times 10$$

---

## 3. Mathematical Proof: Cross-Judge Z-Score Normalization

### 3.1 Definitions & Notation
Let:
- $J$ be the set of judges in the event.
- $P_j$ be the set of projects reviewed by judge $j$, with count $N_j = |P_j|$.
- $x_{ij}$ be the standardized raw score given by judge $j$ to project $i \in P_j$.

For each judge $j$, the sample mean $\mu_j$ is:

$$\mu_j = \frac{1}{N_j} \sum_{i \in P_j} x_{ij}$$

The sample standard deviation $\sigma_j$ with Bessel's correction $(N_j - 1)$ is:

$$\sigma_j = \sqrt{\frac{1}{N_j - 1} \sum_{i \in P_j} (x_{ij} - \mu_j)^2}$$

The global dataset mean $\mu_{\text{global}}$ and target standard deviation $\sigma_{\text{target}}$ across all evaluations are:

$$\mu_{\text{global}} = \frac{1}{\sum_{j} N_j} \sum_{j \in J} \sum_{i \in P_j} x_{ij}$$

$$\sigma_{\text{target}} = \max\left(0.5, \, \sigma_{\text{global}}\right)$$

### 3.2 Standard Z-Score Transformation
For any evaluation where $N_j > 1$ and $\sigma_j > 0$, the standard z-score $z_{ij}$ measures how many standard deviations project $i$ deviates from judge $j$'s personal mean:

$$z_{ij} = \frac{x_{ij} - \mu_j}{\sigma_j}$$

The normalized score $\hat{x}_{ij}$ mapped onto the global scale is:

$$\hat{x}_{ij} = \mu_{\text{global}} + z_{ij} \cdot \sigma_{\text{target}}$$

### 3.3 Theorem 1: Mean Centering & Elimination of Severity Bias
**Claim:** The expected normalized score across each judge's reviews equals the global mean $\mu_{\text{global}}$, eliminating individual judge severity or leniency.

**Proof:**
Taking the expectation of $\hat{x}_{ij}$ over all projects scored by judge $j$:

$$\mathbb{E}_i[\hat{x}_{ij}] = \frac{1}{N_j} \sum_{i \in P_j} \left( \mu_{\text{global}} + \frac{x_{ij} - \mu_j}{\sigma_j} \cdot \sigma_{\text{target}} \right)$$

$$= \mu_{\text{global}} + \frac{\sigma_{\text{target}}}{\sigma_j} \cdot \left( \frac{1}{N_j} \sum_{i \in P_j} (x_{ij} - \mu_j) \right)$$

Since $\sum_{i \in P_j} (x_{ij} - \mu_j) = \sum x_{ij} - N_j \mu_j = N_j \mu_j - N_j \mu_j = 0$:

$$\mathbb{E}_i[\hat{x}_{ij}] = \mu_{\text{global}} + \frac{\sigma_{\text{target}}}{\sigma_j} \cdot 0 = \mu_{\text{global}} \quad \blacksquare$$

Thus, whether a judge awards average scores of $2.0$ or $4.8$, their evaluations are shifted to center on $\mu_{\text{global}}$ without altering relative distinctions among projects.

### 3.4 Theorem 2: Variance Standardization
**Claim:** The sample variance of normalized scores for each judge equals $\sigma_{\text{target}}^2$.

**Proof:**
$$\text{Var}_i(\hat{x}_{ij}) = \frac{1}{N_j - 1} \sum_{i \in P_j} (\hat{x}_{ij} - \mu_{\text{global}})^2$$

$$= \frac{1}{N_j - 1} \sum_{i \in P_j} \left( \frac{x_{ij} - \mu_j}{\sigma_j} \cdot \sigma_{\text{target}} \right)^2$$

$$= \frac{\sigma_{\text{target}}^2}{\sigma_j^2} \cdot \left[ \frac{1}{N_j - 1} \sum_{i \in P_j} (x_{ij} - \mu_j)^2 \right]$$

By definition of $\sigma_j^2$:

$$\text{Var}_i(\hat{x}_{ij}) = \frac{\sigma_{\text{target}}^2}{\sigma_j^2} \cdot \sigma_j^2 = \sigma_{\text{target}}^2 \quad \blacksquare$$

### 3.5 Rigorous Edge-Case Fallbacks
1. **Zero Variance ($\sigma_j = 0$):**
   When a judge assigns identical scores to every project (e.g. Claude Shannon giving 3/5 to all):
   - Division by zero is prevented by setting $z_{ij} = 0$.
   - $\hat{x}_{ij} = \mu_{\text{global}}$.
   - Rationale: The judge identified no relative differences; project ratings are neutral relative to the event pool.
2. **Single Evaluation ($N_j = 1$):**
   - Sample variance cannot be estimated with 1 observation.
   - The system preserves the raw standardized percentage score $x_{ij}$.
3. **Incomplete Review Batches:**
   - Normalization calculates sample statistics strictly across completed reviews $\mathcal{D}_j \subseteq P_j$. Missing reviews do not penalize projects nor distort normalization.
4. **Boundary Clipping:**
   - $\hat{x}_{ij}^{\text{final}} = \min(10, \max(0, \hat{x}_{ij}))$ ensures outputs remain within the bounded domain $[0, 10]$.

---

## 4. Bradley-Terry Pairwise Judging Estimator

For subjective or fast-paced hackathons, judges can compare projects pairwise: *Project A vs Project B*.

### 4.1 Model Formulation
Under the Bradley-Terry model, each project $i$ has an unobserved latent quality parameter $\pi_i > 0$ (or log-strength $\lambda_i = \ln \pi_i$). When project $i$ is compared to project $j$:

$$P(i \succ j) = \frac{\pi_i}{\pi_i + \pi_j} = \frac{e^{\lambda_i}}{e^{\lambda_i} + e^{\lambda_j}}$$

### 4.2 Log-Likelihood Function
Let $w_{ij}$ be the number of times project $i$ was preferred over project $j$, and $N_{ij} = w_{ij} + w_{ji}$. The log-likelihood across all observed pairs is:

$$\ln L(\boldsymbol{\pi}) = \sum_{i < j} \left[ w_{ij} \ln \pi_i + w_{ji} \ln \pi_j - N_{ij} \ln(\pi_i + \pi_j) \right]$$

### 4.3 Minorization-Maximization (Hunter's Algorithm)
To find the Maximum Likelihood Estimate (MLE) $\hat{\boldsymbol{\pi}}$ without matrix inversion, our engine implements Hunter's MM algorithm:

$$\pi_i^{(t+1)} = \frac{W_i + \epsilon}{\sum_{j \neq i} \frac{N_{ij} + 2\epsilon/(n-1)}{\pi_i^{(t)} + \pi_j^{(t)}}}$$

Where:
- $W_i = \sum_{j \neq i} w_{ij}$ is the total wins for project $i$.
- $\epsilon = 0.1$ is a Dirichlet prior pseudo-count that guarantees strong connectivity and existence of a unique MLE even when projects have zero wins or graph components are sparsely connected.
- After each iteration, $\boldsymbol{\pi}$ is normalized such that $\sum_{i=1}^n \pi_i = 1$.
- Convergence is achieved when $\|\boldsymbol{\pi}^{(t+1)} - \boldsymbol{\pi}^{(t)}\|_\infty < 10^{-6}$.

The platform exposes this via `POST /api/judging/pairwise/compare` and `GET /api/judging/pairwise/standings`.
