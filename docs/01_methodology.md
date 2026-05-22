# Methodology

## Core loop

```text
Question -> Measurement -> Baseline -> Hypothesis -> Intervention -> Observation -> Adjustment
```

## Scientific rules

1. Do not confuse convenience variables with research variables.
2. Do not ask what the user wants as the purpose; the purpose is fixed: longevity.
3. Do not use access to gym, equipment, schedule, budget, or preference to define what is ideal.
4. Use logistics only in the implementation phase.
5. Every measurement must answer a question.
6. Every intervention must have a hypothesis.
7. Every hypothesis must have observable outputs.
8. If a metric does not change decisions, lower its priority.
9. If a metric reveals risk, raise its priority.
10. If an assumption is wrong, correct the parameter, question, or interpretation.

## Research variables vs implementation variables

Research variables explain what is happening in the body or environment.

Examples:

- Sleep duration and quality.
- Glucose response.
- Blood pressure.
- VO2 max.
- Strength.
- Pain.
- Food timing.
- Fiber intake.
- Sedentary exposure.
- Air quality.

Implementation variables affect how the plan will later be adapted.

Examples:

- Gym access.
- Schedule.
- Preferred training time.
- Budget.
- Equipment.
- Convenience.

Implementation variables are useful later, but they should not define the ideal model.

## Question design rules

Each form question should define:

- ID.
- Module.
- Visible question.
- Response type.
- Options or unit.
- Generated variable.
- Frequency.
- Use of data.
- Alert logic if applicable.

## Supported response types

- `single_select`
- `multi_select`
- `number`
- `scale`
- `date`
- `time`
- `text_short`
- `text_long`
- `info_only`

## Example question schema

```yaml
id: LONG_005
module: longevity_priorities
question: "What data is missing to evaluate longevity and functional health?"
type: multi_select
options:
  - real_weight
  - waist_hip
  - blood_pressure
  - resting_heart_rate
  - spo2
  - blood_tests
  - ecg
  - cpet_vo2max
  - dexa
  - sleep_study
  - food_log
  - glucose_log
variable: missing_longevity_data
frequency: initial
use: creates_missing_data_list
```
