import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib

def train_models():
    # Load data
    try:
        df = pd.read_csv("eeg_data.csv")
    except FileNotFoundError:
        print("Data file not found. Please run data_generator.py first.")
        return

    # Features and Targets
    features = ['Delta', 'Theta', 'Alpha', 'Beta', 'Theta_Alpha', 'Alpha_Beta', 'Entropy']
    X = df[features]
    y_group = df['AgeGroup']
    y_age_reg = df['Age'] # We can also predict "Cognitive Age" or trends based on features

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y_group, test_size=0.2, random_state=42)
    
    # 1. Age Group Classifier (Random Forest)
    clf_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    clf_pipeline.fit(X_train, y_train)
    print(f"Classifier Accuracy: {clf_pipeline.score(X_test, y_test):.2f}")
    
    # 2. Cognitive Baseline (Regression for Feature Trends)
    # We want to know: For a given Age, what are expected EEG metrics?
    # Actually, simpler approach: We have the user's Age. We can just query the dataset Stats 
    # or predict typical feature values for that age. 
    # Let's train a model that predicts "Expected Cognitive Score" (simulated) from EEG.
    # For now, let's save the main classifier.
    
    joblib.dump(clf_pipeline, "eeg_age_classifier.pkl")
    
    # Calculate and save baselines
    baselines = df.groupby('AgeGroup')[features].mean().to_dict('index')
    joblib.dump(baselines, "age_group_baselines.pkl")
    
    print("Models and baselines saved.")

if __name__ == "__main__":
    train_models()
