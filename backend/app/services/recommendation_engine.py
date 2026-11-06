"""Financial Recommendation Engine with Hybrid LLM API and Rule-Based Fallback."""

import json
from typing import Dict, List, Any
import httpx
from app.config import settings


def generate_rule_based_recommendations(
    monthly_income: float,
    monthly_expenses: float,
    essential_expenses: float,
    discretionary_expenses: float,
    savings_rate: float,
    emergency_months: float,
    goals: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Empirical recommendation heuristics grounded strictly in user's actual figures."""
    recs = []

    # 1. Savings Rate Recommendation
    if savings_rate < 0.20 and monthly_income > 0:
        gap = (0.20 - savings_rate) * monthly_income
        recs.append({
            "id": "rec_savings_rate",
            "category": "savings",
            "title": "Elevate Baseline Savings Rate to 20%",
            "description": (
                f"Your current savings rate is {savings_rate*100:.1f}%. Moving towards a target 20% savings rate "
                f"requires saving an additional ~₹{gap:,.0f}/month."
            ),
            "impact_level": "high",
            "suggested_action": "Set up an automatic recurring bank mandate on salary day before allocating discretionary funds.",
            "potential_monthly_savings": round(gap, 2),
            "source": "rule_engine",
        })

    # 2. Discretionary Spending Optimization
    if monthly_income > 0 and (discretionary_expenses / monthly_income) > 0.30:
        excess = discretionary_expenses - (monthly_income * 0.25)
        recs.append({
            "id": "rec_discretionary_trim",
            "category": "expenses",
            "title": "Trim Non-Essential Dining & Shopping",
            "description": (
                f"Discretionary spending (Food Delivery, Entertainment, Shopping) accounts for "
                f"{(discretionary_expenses/monthly_income)*100:.1f}% of your monthly inflow (₹{discretionary_expenses:,.0f})."
            ),
            "impact_level": "medium",
            "suggested_action": "Audit recurrent food delivery and unused entertainment subscriptions.",
            "potential_monthly_savings": round(max(1000.0, excess), 2),
            "source": "rule_engine",
        })

    # 3. Emergency Safety Cushion
    if emergency_months < 3.0 and essential_expenses > 0:
        shortfall = (3.0 - emergency_months) * essential_expenses
        recs.append({
            "id": "rec_emergency_fund",
            "category": "emergency_fund",
            "title": "Build a 3-Month Essential Safety Buffer",
            "description": (
                f"Your liquid reserves cover {emergency_months:.1f} months of fixed living commitments. "
                f"Establishing an initial 3-month cushion (₹{3*essential_expenses:,.0f}) insulates you against unexpected medical or vehicle shocks."
            ),
            "impact_level": "high",
            "suggested_action": "Route 50% of monthly surplus into a high-yield liquid or flexi-deposit account.",
            "potential_monthly_savings": 0.0,
            "source": "rule_engine",
        })

    # 4. Goals Feasibility Guidance
    for goal in goals:
        if goal.get("feasibility_status") == "Feasible with adjustments":
            recs.append({
                "id": f"rec_goal_{goal.get('id', '1')}",
                "category": "goals",
                "title": f"Protect Timeline for '{goal.get('name', 'Goal')}'",
                "description": (
                    f"To meet your ₹{goal.get('target_amount', 0):,.0f} target by {goal.get('target_date', 'deadline')}, "
                    f"ensure ₹{goal.get('required_monthly_savings', 0):,.0f}/mo is consistently prioritized."
                ),
                "impact_level": "medium",
                "suggested_action": "Dedicate monthly savings directly to a separate goal sub-account.",
                "potential_monthly_savings": 0.0,
                "source": "rule_engine",
            })

    # Fallback positive baseline if metrics are stellar
    if not recs:
        recs.append({
            "id": "rec_maintain_course",
            "category": "savings",
            "title": "Maintain Disciplined Financial Cadence",
            "description": "Your current savings rate, expense coverage, and goal allocations are well-balanced.",
            "impact_level": "low",
            "suggested_action": "Periodically review bank statements and index surplus funds into diversified long-term vehicles.",
            "potential_monthly_savings": 0.0,
            "source": "rule_engine",
        })

    return recs


async def generate_ai_recommendations(
    monthly_income: float,
    monthly_expenses: float,
    essential_expenses: float,
    discretionary_expenses: float,
    savings_rate: float,
    emergency_months: float,
    goals: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Generate recommendations using backend LLM integration with automatic rule-based fallback.
    """
    # If no LLM API key configured in .env, seamlessly use rule-based engine
    if not settings.LLM_API_KEY:
        return generate_rule_based_recommendations(
            monthly_income,
            monthly_expenses,
            essential_expenses,
            discretionary_expenses,
            savings_rate,
            emergency_months,
            goals,
        )

    # Prepare prompt for LLM
    prompt = f"""
    You are an expert certified financial advisor. Given the user's authentic financial metrics:
    - Monthly Income: INR {monthly_income:,.2f}
    - Total Monthly Expenses: INR {monthly_expenses:,.2f}
    - Essential Fixed Living Expenses: INR {essential_expenses:,.2f}
    - Discretionary Expenses: INR {discretionary_expenses:,.2f}
    - Savings Rate: {savings_rate*100:.1f}%
    - Emergency Cushion: {emergency_months:.1f} months
    - Active Savings Goals: {json.dumps(goals)}

    Generate 3 to 4 data-grounded, specific financial recommendations in JSON format.
    Return ONLY a JSON array with objects matching:
    [
      {{
        "id": "unique_string",
        "category": "savings|expenses|emergency_fund|goals",
        "title": "Concise actionable title",
        "description": "Detailed explanation mentioning actual INR numbers",
        "impact_level": "high|medium|low",
        "suggested_action": "Concrete next step",
        "potential_monthly_savings": 0.0
      }}
    ]
    """

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if settings.LLM_PROVIDER.lower() == "gemini":
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={settings.LLM_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json"},
                }
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    for item in parsed:
                        item["source"] = "ai_model"
                    return parsed

    except Exception:
        pass

    # Seamless fallback to deterministic rule engine
    return generate_rule_based_recommendations(
        monthly_income,
        monthly_expenses,
        essential_expenses,
        discretionary_expenses,
        savings_rate,
        emergency_months,
        goals,
    )

