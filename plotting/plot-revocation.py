import json
import matplotlib.pyplot as plt
import numpy as np

# Read data from the JSON file
with open('../results/revocation.json') as f:
    data = json.load(f)

# Extract avg_time in milliseconds and create a list of numbers representing the index
index = list(range(1, len(data) + 1))
avg_times_ms = [entry['avg_time'] for entry in data]

# Fit a polynomial (trendline) of degree 1 (linear fit)
coefficients = np.polyfit(index, avg_times_ms, 1)
trendline = np.poly1d(coefficients)

# Plot the data
plt.plot(index, avg_times_ms, marker='o', linestyle='-', label='Data')
plt.plot(index, trendline(index), linestyle='--', color='red', label='Trendline')
plt.xlabel('Number of delegations')
plt.ylabel('Average Revocation Time (ms)')
plt.title('Average Time vs Number of Delegations')
plt.legend()

# Set ticks on the x-axis to include every integer
plt.xticks(index)

# Save the plot as an image file (e.g., PNG, PDF, SVG)
plt.savefig('avg_revoc_time_vs_nb_delegations.png')  # Change the extension to save in a different format
plt.show()