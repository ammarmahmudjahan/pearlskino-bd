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