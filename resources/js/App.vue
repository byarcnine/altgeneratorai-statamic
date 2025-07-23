<template>
  <div class="container alt-generator-ai">
    <div class="flex items-center justify-between mb-6">
      <h1>Alt Generator AI</h1>
      <div class="flex items-center space-x-4">
        <div class="flex items-center">
          <input
            type="checkbox"
            id="missingAltOnly"
            v-model="missingAltOnly"
            class="form-checkbox"
            @change="handleFilterChange"
          />
          <label for="missingAltOnly" class="ml-2"
            >Show only assets without alt text</label
          >
        </div>
      </div>
    </div>
    <div class="flex justify-between mb-4">
      <div class="text-sm text-gray-600">
        {{ assetsWithoutAltCount }} assets without alt text
      </div>
      <button
        v-if="assetsWithoutAltCount > 0"
        @click="handleGenerateAndApproveAll"
        :disabled="loading || generatingAll"
        class="btn btn-primary"
      >
        <span v-if="generatingAll">
          {{ generatingAllStatus }}
        </span>
        <span v-else>
          Generate & Approve All ({{ assetsWithoutAltCount }})
        </span>
      </button>
    </div>

    <div class="card">
      <div class="p-4">
        <asset-table
          ref="assetTable"
          :assets="assets"
          :current-page="currentPage"
          :total-pages="totalPages"
          @generate="handleGenerate"
          @approve="handleApprove"
          @bulk-approve="handleBulkApprove"
          @page-changed="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script>
import AssetTable from "./components/AssetTable.vue";
import axios from "axios";

export default {
  name: "App",
  components: {
    AssetTable,
  },
  data() {
    return {
      assets: [],
      currentPage: 1,
      totalPages: 1,
      loading: false,
      missingAltOnly: false,
      assetsWithoutAltCount: 0,
      generatingAll: false,
      generatingAllStatus: "Generating...",
    };
  },
  created() {
    this.fetchAssets();
  },
  methods: {
    async fetchAssets(page = 1) {
      try {
        this.loading = true;
        const response = await axios.get(
          `/altgeneratorai/assets?page=${page}&missing_alt_only=${this.missingAltOnly}`,
          {
            headers: {
              "X-CSRF-TOKEN": window.csrf_token,
            },
            withCredentials: true,
          }
        );
        this.assets = response.data.data;
        this.currentPage = response.data.current_page;
        this.totalPages = response.data.last_page;
        this.assetsWithoutAltCount = response.data.assets_without_alt_count;
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        this.loading = false;
      }
    },
    async handleGenerate(assetIds) {
      try {
        const response = await axios.post(
          "/altgeneratorai/generate",
          {
            asset_ids: assetIds,
          },
          {
            headers: {
              "X-CSRF-TOKEN": window.csrf_token,
            },
            withCredentials: true,
          }
        );

        // Update the assets with generated alt text
        this.assets = this.assets.map((asset) => {
          if (assetIds.includes(asset.id)) {
            return {
              ...asset,
              generated_alt: response.data.generated[asset.id],
            };
          }
          return asset;
        });

        // Notify the AssetTable that generation is complete
        this.$refs.assetTable.generationComplete(assetIds);
      } catch (error) {
        console.error("Error generating alt text:", error);
        alert(
          "An error occurred while generating the alt text. Please try again."
        );
        // Make sure to clear loading state even on error
        this.$refs.assetTable.generationComplete(assetIds);
      }
    },
    async handleApprove({ assetId, newAlt }) {
      try {
        await axios.post(
          "/altgeneratorai/approve",
          {
            approvals: {
              [assetId]: newAlt,
            },
          },
          {
            headers: {
              "X-CSRF-TOKEN": window.csrf_token,
            },
            withCredentials: true,
          }
        );

        // Update the asset status
        this.assets = this.assets.map((asset) => {
          if (asset.id === assetId) {
            return {
              ...asset,
              is_approved: true,
            };
          }
          return asset;
        });
      } catch (error) {
        console.error("Error approving alt text:", error);
        alert("An error occurred while approving the alt text.");
      }
    },
    async handleBulkApprove(approvals) {
      try {
        await axios.post("/altgeneratorai/approve", {
          approvals,
        });

        // Update the assets status
        this.assets = this.assets.map((asset) => {
          if (approvals[asset.id]) {
            return {
              ...asset,
              is_approved: true,
            };
          }
          return asset;
        });
      } catch (error) {
        console.error("Error bulk approving alt text:", error);
        alert("An error occurred while bulk approving the alt text.");
      }
    },
    async handlePageChange(page) {
      await this.fetchAssets(page);
    },
    async handleFilterChange() {
      this.currentPage = 1; // Reset to first page when filter changes
      await this.fetchAssets(1);
    },
    async handleGenerateAndApproveAll() {
      if (this.generatingAll) {
        return; // Prevent multiple clicks
      }
      this.generatingAll = true;
      this.generatingAllStatus = "Starting bulk generation...";

      try {
        let totalProcessed = 0;
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          this.generatingAllStatus = `Processing page ${currentPage}...`;

          // Fetch assets for the current page with missing alt only
          const response = await axios.get(
            `/altgeneratorai/assets?page=${currentPage}&missing_alt_only=true`,
            {
              headers: {
                "X-CSRF-TOKEN": window.csrf_token,
              },
              withCredentials: true,
            }
          );

          const pageAssets = response.data.data;
          const totalPages = response.data.last_page;

          // Filter assets that need processing
          const assetIds = pageAssets
            .filter((asset) => !asset.is_approved && !asset.generated_alt)
            .map((asset) => asset.id);

          if (assetIds.length > 0) {
            this.generatingAllStatus = `Generating alt text for ${assetIds.length} assets on page ${currentPage}/${totalPages}...`;

            // Generate alt text for this page's assets
            const generateResponse = await axios.post(
              "/altgeneratorai/generate",
              {
                asset_ids: assetIds,
              },
              {
                headers: {
                  "X-CSRF-TOKEN": window.csrf_token,
                },
                withCredentials: true,
              }
            );

            this.generatingAllStatus = `Approving ${assetIds.length} assets on page ${currentPage}/${totalPages}...`;

            // Prepare approvals object with generated alt text
            const approvals = {};
            Object.keys(generateResponse.data.generated).forEach((assetId) => {
              approvals[assetId] = generateResponse.data.generated[assetId];
            });

            // Bulk approve this page's generated alt text
            await axios.post(
              "/altgeneratorai/approve",
              {
                approvals,
              },
              {
                headers: {
                  "X-CSRF-TOKEN": window.csrf_token,
                },
                withCredentials: true,
              }
            );

            totalProcessed += assetIds.length;
          }

          // Check if there are more pages
          hasMorePages = currentPage < totalPages;
          currentPage++;
        }

        // Refresh the current page to show updated data
        await this.fetchAssets(this.currentPage);

        if (totalProcessed > 0) {
          alert(
            `Successfully generated and approved ${totalProcessed} assets across all pages.`
          );
        } else {
          alert("No assets without alt text found to process.");
        }
      } catch (error) {
        console.error("Error generating and approving all:", error);
        alert(
          "An error occurred while generating and approving all assets. Please try again."
        );
      } finally {
        this.generatingAll = false;
        this.generatingAllStatus = "Generating...";
      }
    },
  },
};
</script>

<style>
.skeleton-pulse {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.9;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 0.9;
  }
}
</style>
