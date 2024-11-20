---
title: Power draw of different processors
---

# CPU Power Draw Comparison

The following CPUs are commonly used in computing workloads, with their typical power draw per core:


<!-- TODO Select off a dimension grid -->
<!-- ```sql pdc_dimensions -->
<!-- select * from v2_2.TDP_cpu -->
<!-- ``` -->

```sql processor_power
select 
  model,
  TDP_per_core as power_draw,
  'CPU' as type
from v2_2.TDP_cpu
union all
select
  model,
  TDP_per_core as power_draw,
  'GPU' as type 
from v2_2.TDP_gpu
order by power_draw desc
```

<!-- <DimensionGrid  -->
<!--     data={pdc_dimensions}  -->
<!--     name="selected_dimensions" -->
<!--     metric='TDP_per_core'  -->
<!--     multiple -->
<!-- /> -->

<BarChart 
    data={processor_power}
    x=model
    y=power_draw
    series=type
    colorPalette={[
        '#cf0d06', // CPU
        '#0d6ecf', // GPU
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

# Combined Processor Power Draw Comparison

The chart above shows power draw for both CPUs (per core) and GPUs (total). As you can see, GPUs typically have much higher total power requirements compared to individual CPU cores.

## Notes

- CPU power draw is shown per core, while GPU power draw represents the total power consumption
- Actual power consumption may vary based on workload, cooling, and system configuration
- Values shown are Thermal Design Power (TDP) which represents the maximum power draw under typical load
- Some specialized AI accelerators like Google's TPU are included in the GPU comparison due to similar use cases

For the most up-to-date power consumption data and to calculate the carbon footprint of your computing workload, visit [Green Algorithms Calculator](http://calculator.green-algorithms.org).
