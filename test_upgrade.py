import requests
import pandas as pd
import io

BASE_URL = "http://localhost:8000"


def test_manual_prediction_partial():
    print("\n--- Testing Manual Prediction (Partial Input) ---")
    payload = {
        "Retort_Temperature": 121.0,
        "Holding_Time": 20.0,
        "F0": 25.0,
        "Storage_Temperature": 35.0,
        "Storage_Day": 10.0,
        # Optional quality values omitted
    }
    try:
        response = requests.post(f"{BASE_URL}/manual-predict", json=payload)
        if response.status_code == 200:
            data = response.json()
            print("Success!")
            print(f"Predicted Shelf Life: {data['shelf_life']}")
            print(f"Risk Level: {data['risk_level']}")
            print("Estimated Quality Values:")
            for k, v in data["estimated_quality"].items():
                print(f"  {k}: {v:.4f}")
        else:
            print(f"Failed! Status: {response.status_code}, Detail: {response.text}")
    except Exception as e:
        print(f"Error: {e}")


def test_csv_prediction_partial():
    print("\n--- Testing CSV Prediction (Partial Columns) ---")
    # Create simple CSV with only base features
    df = pd.DataFrame(
        [
            {
                "Retort_Temperature": 125.0,
                "Holding_Time": 15.0,
                "F0": 20.0,
                "Storage_Temperature": 25.0,
                "Storage_Day": 5.0,
            }
        ]
    )

    csv_buffer = io.BytesIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    files = {"file": ("test_partial.csv", csv_buffer, "text/csv")}
    mapping = {
        "Retort_Temperature": "Retort_Temperature",
        "Holding_Time": "Holding_Time",
        "F0": "F0",
        "Storage_Temperature": "Storage_Temperature",
        "Storage_Day": "Storage_Day",
    }

    try:
        response = requests.post(
            f"{BASE_URL}/predict",
            files=files,
            data={"mapping": pd.Series(mapping).to_json()},
        )
        if response.status_code == 200:
            results = response.json()
            print("Success!")
            row = results[0]
            print(f"Predicted Shelf Life: {row['Shelf_Life']}")
            print(f"Estimated pH (New Column): {row['Estimated_pH']}")
        else:
            print(f"Failed! Status: {response.status_code}, Detail: {response.text}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    # Ensure server is running before executing this
    try:
        requests.get(f"{BASE_URL}/health")
        test_manual_prediction_partial()
        test_csv_prediction_partial()
    except requests.exceptions.ConnectionError:
        print(f"Could not connect to server at {BASE_URL}. Is it running?")
