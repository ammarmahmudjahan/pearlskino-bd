export const GOOGLE_FORMS = {
  contact: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLScuO37t0M5CprIQpmvPuefhTiOVMYoqHLrjpblcmXIvChj2hw/formResponse",

    fields: {
      name: "entry.961276055",
      phone: "entry.342621931",
      message: "entry.701273417",
    },
  },

  order: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSeTF6cjzCfHQ1GzPbC_1_SMb51XBBiRb3iiWhDk_wvu9_Dduw/formResponse",

    fields: {
      name: "entry.666438",
      phone: "entry.1430470632",
      email: "entry.865197596",
      address: "entry.1878459326",
      area: "entry.249342578",
      products: "entry.939536380",
      quantity: "entry.1693561923",
      total: "entry.967821568",
      payment: "entry.1200901663",
      delivery: "entry.296096183",
      note: "entry.63587775",
    },
  },
};


/* =========================================================
   GOOGLE FORM SUBMISSION
========================================================= */

export async function submitToGoogleForm(
  formUrl,
  fields
) {
  try {
    const formData = new FormData();

    Object.entries(fields).forEach(
      ([entryId, value]) => {
        formData.append(
          entryId,
          value ?? ""
        );
      }
    );

    await fetch(formUrl, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Google Form submission failed:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }
}