<template>
  <tr>
    <td>
      <input
        type="checkbox"
        :checked="selected"
        @change="$emit('select', asset.id)"
      />
    </td>
    <td>
      <img
        :src="asset.preview_url"
        :alt="asset.current_alt"
        class="w-12 h-12 object-cover rounded"
      />
    </td>
    <td class="wrap-anywhere">{{ asset.filename }}</td>
    <td>{{ asset.current_alt }}</td>
    <td>
      <div v-if="asset.generated_alt" class="alt-text-content">
        {{ asset.generated_alt[0] }}
      </div>
      <div v-else-if="isGenerating" class="alt-text-skeleton">
        <div>
          <div class="h-3 bg-gray-300 rounded w-full mb-2 skeleton-pulse"></div>
          <div class="h-3 bg-gray-300 rounded w-5/6 mb-2 skeleton-pulse"></div>
          <div class="h-3 bg-gray-300 rounded w-4/6 skeleton-pulse"></div>
        </div>
      </div>
    </td>
    <td>
      <button
        v-if="!asset.generated_alt"
        type="button"
        class="btn-sm generate-btn btn-primary"
        :disabled="isGenerating"
        @click="$emit('generate', asset.id)"
      >
        Generate
      </button>
      <button
        v-else-if="!asset.is_approved"
        type="button"
        class="btn-sm approve-btn btn-primary bg-green-600"
        @click="
          $emit('approve', {
            assetId: asset.id,
            newAlt: asset.generated_alt,
          })
        "
      >
        Approve
      </button>
      <span v-else class="text-green-600 font-medium">Approved</span>
    </td>
  </tr>
</template>

<script>
export default {
  name: "AssetRow",
  props: {
    asset: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    isGenerating: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
