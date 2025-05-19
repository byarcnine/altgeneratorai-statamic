async function processAltTextGeneration(page = 1) {
  try {
    // Step 1: Fetch assets from the specified page
    const assetsResponse = await fetch(`/altgeneratorai/assets?page=${page}`, {
      headers: {
        "X-CSRF-TOKEN": window.csrf_token,
      },
      credentials: "include",
    });

    if (!assetsResponse.ok) {
      throw new Error("Failed to fetch assets");
    }

    const assetsData = await assetsResponse.json();

    // If no assets are returned, return early
    if (!assetsData.data || assetsData.data.length === 0) {
      return {
        success: true,
        message: "No more assets to process",
        data: null,
      };
    }

    console.log(`Fetched ${assetsData.data.length} assets from page ${page}`);

    // Step 2: Generate alt text for each asset
    const generateResponse = await fetch("/altgeneratorai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": window.csrf_token,
      },
      credentials: "include",
      body: JSON.stringify({
        asset_ids: assetsData.data.map((asset) => asset.id),
      }),
    });

    if (!generateResponse.ok) {
      throw new Error("Failed to generate alt text");
    }

    const generatedData = await generateResponse.json();
    console.log("Generated alt text for assets:", generatedData.generated);

    // Step 3: Approve the generated alt text
    const approvals = {};
    Object.entries(generatedData.generated).forEach(([assetId, altText]) => {
      approvals[assetId] = altText;
    });

    const approveResponse = await fetch("/altgeneratorai/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": window.csrf_token,
      },
      credentials: "include",
      body: JSON.stringify({
        approvals: approvals,
      }),
    });

    if (!approveResponse.ok) {
      throw new Error("Failed to approve alt text");
    }

    const approveData = await approveResponse.json();
    console.log("Approved alt text for assets:", approveData);

    return {
      success: true,
      message: `Successfully processed ${assetsData.data.length} assets`,
      data: approveData,
      hasMorePages: assetsData.current_page < assetsData.last_page,
    };
  } catch (error) {
    console.error("Error in alt text generation process:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function processAllPages() {
  let currentPage = 59;
  let totalProcessed = 0;
  let hasMorePages = true;

  console.log("Starting to process all pages...");

  while (hasMorePages) {
    console.log(`\nProcessing page ${currentPage}...`);
    const result = await processAltTextGeneration(currentPage);

    if (!result.success) {
      console.error(`Failed to process page ${currentPage}:`, result.error);
      break;
    }

    if (!result.data) {
      console.log("No more assets to process.");
      break;
    }

    totalProcessed += result.data.length || 0;
    hasMorePages = result.hasMorePages;
    currentPage++;

    // Add a small delay between pages to prevent overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    `\nFinished processing all pages. Total assets processed: ${totalProcessed}`
  );
  return totalProcessed;
}

// Example usage:
// processAllPages().then(total => console.log(`Total assets processed: ${total}`));
