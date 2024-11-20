---
title: V2.2 Data Tables
---

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
where table_schema = 'v2_2'
order by table_name
```

{#each table_list as table}

# {table.display_name}

```sql {table.table_name}
select * from v2_2.{table.table_name}
```

<DataTable 
    data={eval(table.table_name)}
    search=true
    rows=10
/>

{/each}
