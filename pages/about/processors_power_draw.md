---
title: Power draw of different processors
---

# CPU Power Draw Comparison

The following CPUs are commonly used in computing workloads, with their typical power draw per core:


<!-- TODO Select off a dimension grid -->
<!-- ```sql pdc_dimensions -->
<!-- select * from v2_2.TDP_cpu -->
<!-- ``` -->

```sql cpu_pdc
select
model,
TDP_per_core
from v2_2.TDP_cpu 

```

<!-- <DimensionGrid  -->
<!--     data={pdc_dimensions}  -->
<!--     name="selected_dimensions" -->
<!--     metric='TDP_per_core'  -->
<!--     multiple -->
<!-- /> -->

<BarChart 
    data={cpu_pdc}
    x=model
    y=TDP_per_core
    colorPalette={[
        '#cf0d06',
        '#eb5752',
        '#e88a87',
        '#fcdad9',
        ]}
/>

## Example

<!-- select state, category, item, channel, sales from needful_things.orders -->

<!-- select  -->
<!-- order_month,  -->
<!-- sum(sales) as sales_usd0  -->
<!-- from needful_things.orders  -->
<!-- where ( true ) -->
<!-- group by all -->

<!-- <DimensionGrid data={orders} metric='sum(sales)' name=selected_dimensions />  -->

<!-- <LineChart data={monthly_sales} handleMissing=zero /> -->

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
