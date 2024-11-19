---
title: V2.2 Data Tables
---

# Carbon Intensity Data

```sql carbon_intensity
select * from v2_2.CI_aggregated
```

<DataTable 
    data={carbon_intensity} 
    search=true
    rows=10
/>

# CPU TDP Data

```sql cpu_tdp
select * from v2_2.TDP_cpu
```

<DataTable 
    data={cpu_tdp}
    search=true 
    rows=10
/>

# GPU TDP Data

```sql gpu_tdp
select * from v2_2.TDP_gpu
```

<DataTable 
    data={gpu_tdp}
    search=true
    rows=10
/>

# Cloud Provider Datacenters

```sql cloud_datacenters
select * from v2_2.cloudProviders_datacenters
```

<DataTable 
    data={cloud_datacenters}
    search=true
    rows=10
/>

# Default PUE Values

```sql default_pue
select * from v2_2.defaults_PUE
```

<DataTable 
    data={default_pue}
    search=true
    rows=10
/>

# Local Provider Datacenters

```sql local_datacenters
select * from v2_2.localProviders_datacenters
```

<DataTable 
    data={local_datacenters}
    search=true
    rows=10
/>

# Provider Names and Codes

```sql provider_names
select * from v2_2.providersNamesCodes
```

<DataTable 
    data={provider_names}
    search=true
    rows=10
/>

# Provider Hardware

```sql provider_hardware
select * from v2_2.providers_hardware
```

<DataTable 
    data={provider_hardware}
    search=true
    rows=10
/>

# Reference Values

```sql reference_values
select * from v2_2.referenceValues
```

<DataTable 
    data={reference_values}
    search=true
    rows=10
/>

# Server Offsets

```sql server_offsets
select * from v2_2.servers_offset
```

<DataTable 
    data={server_offsets}
    search=true
    rows=10
/> 