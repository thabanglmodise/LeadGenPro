---
name: add-houdini-endpoint
description: How to use Houdini, the graphQL svelte client.
---

# Add Houdini Endpoint

How to add a endpoint with Houdini, the graphQL svelte client, to a +page.svelte,

## Process

### 1. Decide on a loading pattern
- manual loading
- automatic loading (prefer automatic loading when possible)

### 2. Add data props to the sibling `+page.svelte`
- ensure to import the correct types inferred when creating the load file

## syntax

### Manual Loading

```ts
// src/routes/(pages)/myPage/+page.ts
import { load_MyQuery } from '$houdini'

/** @type { import('./$houdini').PageLoad } */
export const load = async (event) => {
    return {
        ...(await load_MyQuery({ event })),
    }
}
```

```ts
// src/routes/(pages)/myPage/+page.svelte
<script>
    /** @type { import('./$houdini').PageData } */
    export let data
    
    $: ({ MyQuery } = data)
</script>

{$MyQuery.data.value}
```
If your query has variables, you can pass them straight to the loader:

```ts
// src/routes/(pages)/myPage/+page.svelte
import { load_MyQuery } from '$houdini'

/** @type { import('./$houdini').PageLoad } */
export const load = async (event) => {
    return {
        ...(await load_MyQuery({
            event,
            variables: { variable1: 'value' },
        })),
    }
}
```

### Automatic Loading

#### Query Variables
- The simplest way to pass values for your query inputs is to use route parameters.
```ts
// src/routes/(pages)/myPage/+page.ts
import { graphql } from '$houdini'
import { error } from '@sveltejs/kit'

export const _houdini_load = graphql(`
    query AllItems($completed: Boolean) {
        items(completed: $completed) {
            id
            text
        }
    }
`)

// This is the function for the AllItems query.
// Query variable functions must be named _<QueryName>Variables.
/** @type { import('./$houdini').AllItemsVariables } */
export const _AllItemsVariables = (event) => {
    // make sure we recognize the value
    if (!['active', 'completed'].includes(event.params.filter)) {
        throw error(400, 'invalid filter')
    }

    return {
        completed: event.params.filter === 'completed',
    }
}
```

#### hooks
-  to add additional logic to a component’s query
- _houdini_beforeLoad: Called before Houdini executes load queries against the server. You can expect the same arguments as SvelteKit’s load function.
- _houdini_afterLoad: Called after Houdini executes load queries against the server. 
- _houdini_onError: If defined, the load function will invoke this function instead of throwing an error when an error is received. It receives three inputs: the load event, the inputs for each query, and the error that was encountered
- defined in: src/routes/(pages)/myPage/+page.ts

**_houdini_beforeLoad**
```ts
import { graphql } from '$houdini'
import { redirect } from '@sveltejs/kit'

export const _houdini_load = graphql(`
    query AllItems($completed: Boolean) {
        items(completed: $completed) {
            id
            text
        }
    }
`)

/**
 * @param { import('./$houdini').BeforeLoadEvent }
 */
export function _houdini_beforeLoad({ page, session }) {
    if (!session.authenticated) {
        throw redirect(302, '/login')
    }

    return {
        message: 'Number of items:',
    }
}
```

**_houdini_afterLoad**
```ts
import { graphql } from '$houdini'
import { error } from '@sveltejs/kit'

export const _houdini_load = graphql(`
    query MyProfile($id: ID!) {
        profile(id: $id) {
            name
        }
    }
`)

/** @type { import('./$houdini').MyProfileVariables } */
export const _MyProfileVariables = ({ params }) => {
    return { id: params.id }
}

/**
 * @param { import('./$houdini').AfterLoadEvent }
 */
export function _houdini_afterLoad({ data }) {
    if (!data.MyProfile) {
        throw error(404)
    }

    return {
        message: "Hello I'm",
    }
}
```

**_houdini_onError**
```ts
import { graphql } from '$houdini'

export const _houdini_load = graphql(`
    query MyProfile {
        profile {
            name
        }
    }
`)

/**
 * @param { import('./$houdini').OnErrorEvent }
 */
export function _houdini_onError({ error }) {
    throw this.redirect(307, '/login')
}
```

### Notes

In Houdini 2.0 +page.gql and +layout.gql are no longer supported due to a regression in SvelteKit’s logic

