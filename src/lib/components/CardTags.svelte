<script lang="ts">
  import { tagHue } from "$lib/badges";

  // A card's tags (a space-separated string) rendered as colored badges.
  let { tags }: { tags: string } = $props();
  let list = $derived(tags.split(/\s+/).filter(Boolean));
</script>

{#if list.length}
  <div class="mt-1.5 flex flex-wrap gap-1">
    {#each list as t (t)}
      <span
        class="tag-badge inline-block max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none"
        style="--h: {tagHue(t)}"
      >{t}</span>
    {/each}
  </div>
{/if}

<style>
  .tag-badge {
    background: hsl(var(--h) 70% 50% / 0.16);
    color: hsl(var(--h) 60% 38%);
  }
  :global(html.dark) .tag-badge {
    background: hsl(var(--h) 60% 60% / 0.22);
    color: hsl(var(--h) 70% 72%);
  }
</style>
