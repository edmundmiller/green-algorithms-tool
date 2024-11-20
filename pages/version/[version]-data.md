# {params.version} Data Tables

# Carbon Intensity Data

```sql carbon_intensity
select * from ${params.version}.CI_aggregated
```

<DataTable 
    data={carbon_intensity} 
    search=true
    rows=10
/>

# CPU TDP Data

```sql cpu_tdp
select * from ${params.version}.TDP_cpu
```

<DataTable 
    data={cpu_tdp}
    search=true 
    rows=10
/>

# GPU TDP Data

```sql gpu_tdp
select * from ${params.version}.TDP_gpu
```

<DataTable 
    data={gpu_tdp}
    search=true
    rows=10
/>

# Cloud Provider Datacenters

```sql cloud_datacenters
select * from ${params.version}.cloudProviders_datacenters
```

<DataTable 
    data={cloud_datacenters}
    search=true
    rows=10
/>

# Default PUE Values

```sql default_pue
select * from ${params.version}.defaults_PUE
```

<DataTable 
    data={default_pue}
    search=true
    rows=10
/>

# Local Provider Datacenters

```sql local_datacenters
select * from ${params.version}.localProviders_datacenters
```sql table_list
select 
    table_name,
    replace(
        initcap(
            replace(table_name, '_', ' ')
        ),
        'Ci', 'Carbon Intensity',
        'Cpu', 'CPU',
        'Gpu', 'GPU',
        'Pue', 'PUE'
    ) as display_name
from information_schema.tables 
where table_schema = '${params.version}'
order by table_name
```

<DataTable 
    data={local_datacenters}
    search=true
    rows=10
/>
{#each table_list as table}

# Provider Names and Codes
# {table.display_name}

```sql provider_names
select * from ${params.version}.providersNamesCodes
```sql {table.table_name}
select * from ${params.version}.{table.table_name}
```

<DataTable 
    data={provider_names}
    data={eval(table.table_name)}
    search=true
    rows=10
/>

# Provider Hardware

```sql provider_hardware
select * from ${params.version}.providers_hardware
```

<DataTable 
    data={provider_hardware}
    search=true
    rows=10
/>

# Reference Values

```sql reference_values
select * from ${params.version}.referenceValues
```

<DataTable 
    data={reference_values}
    search=true
    rows=10
/>

# Server Offsets

```sql server_offsets
select * from ${params.version}.servers_offset
```

<DataTable 
    data={server_offsets}
    search=true
    rows=10
/> 
