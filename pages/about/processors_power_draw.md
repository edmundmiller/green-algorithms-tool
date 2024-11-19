---
title: Power draw of different processors
---

# CPU Power Draw Comparison

The following CPUs are commonly used in computing workloads, with their typical power draw per core:

| Processor | Power Draw per Core (W) |
|-----------|------------------------|
| Ryzen 5 3500U | 15 |
| Xeon Platinum 9282 | 14 |
| Xeon E5-2683 v4 | 12 |
| Core i7-10700 | 12 |
| Xeon Gold 6142 | 11 |
| Core i5-10600 | 10 |
| Ryzen 5 3600 | 10 |
| Core i9-10920XE | 9 |
| Core i5-10600K | 9 |
| Ryzen 5 3400G | 8 |
| Core i3-10320 | 8 |
| Xeon X3430 | 7 |

```sql cpu_pdc
select model,TDP_per_core from v2_2.TDP_cpu
```

<BarChart 
    data={cpu_pdc}
    x=model
    y=TDP_per_core
/>

# GPU Power Draw Comparison

Graphics Processing Units (GPUs) typically have higher power requirements:

| GPU | Total Power Draw (W) |
|-----|-------------------|
| NVIDIA Tesla V100 | 300 |
| NVIDIA Tesla P100 PCIe | 250 |
| NVIDIA GTX TITAN X | 250 |
| NVIDIA RTX 2080 Ti | 250 |
| TPU v3 | 200 |
| NVIDIA GTX 1080 | 180 |
| NVIDIA Tesla T4 | 70 |
| NVIDIA Jetson AGX Xavier | 30 |

## Notes

- CPU power draw is shown per core, while GPU power draw represents the total power consumption
- Actual power consumption may vary based on workload, cooling, and system configuration
- Values shown are Thermal Design Power (TDP) which represents the maximum power draw under typical load
- Some specialized AI accelerators like Google's TPU are included in the GPU comparison due to similar use cases

For the most up-to-date power consumption data and to calculate the carbon footprint of your computing workload, visit [Green Algorithms Calculator](http://calculator.green-algorithms.org).
