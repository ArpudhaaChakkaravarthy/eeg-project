import pandas as pd
import numpy as np

def generate_eeg_data(n_samples=2000):
    np.random.seed(42)
    
    # Generate random ages between 6 and 80
    ages = np.random.randint(6, 81, n_samples)
    
    data = []
    
    for age in ages:
        # Base trends + random noise
        # Note: These are simplified heuristic trends for demonstration
        noise_factor = 0.2
        
        # Delta: Decreases with age
        delta = 4.0 - (0.04 * age) + np.random.normal(0, 0.5)
        delta = max(0.5, delta)
        
        # Theta: Decreases with age
        theta = 3.5 - (0.03 * age) + np.random.normal(0, 0.5)
        theta = max(0.5, theta)
        
        # Alpha: Low in very young, peaks in young adult, slight decline
        if age < 15:
            alpha = 1.0 + (0.2 * age) # Increasing
        elif age < 50:
            alpha = 4.0 + np.random.normal(0, 0.5) # Stable
        else:
            alpha = 4.0 - (0.02 * (age - 50)) # Decline
        alpha += np.random.normal(0, 0.5)
        alpha = max(0.5, alpha)
        
        # Beta: Increases slightly with age (more processing/stress)
        beta = 1.5 + (0.02 * age) + np.random.normal(0, 0.4)
        beta = max(0.5, beta)
        
        # Ratios
        theta_alpha = theta / alpha if alpha > 0 else 0
        alpha_beta = alpha / beta if beta > 0 else 0
        
        # Entropy: Proxy for complexity, generally increases then stabilizes
        entropy = 0.5 + (0.01 * age) if age < 25 else 0.75
        entropy += np.random.normal(0, 0.1)
        
        # Age Group Classification
        if age <= 12:
            group = 'Child'
        elif age <= 18:
            group = 'Adolescent'
        elif age <= 60:
            group = 'Adult'
        else:
            group = 'Senior'
            
        data.append({
            'Age': age,
            'Delta': delta,
            'Theta': theta,
            'Alpha': alpha,
            'Beta': beta,
            'Theta_Alpha': theta_alpha,
            'Alpha_Beta': alpha_beta,
            'Entropy': entropy,
            'AgeGroup': group
        })
        
    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    df = generate_eeg_data()
    df.to_csv("synthetic_eeg_data.csv", index=False)
    print("Synthetic data generated: synthetic_eeg_data.csv")
