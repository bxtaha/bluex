const catchErrors = (error, displayError) => {
  let errorMsg
  if (error.response) {
    errorMsg = error.response.data

    // for image upload
    if (error.response.data.error) {
      errorMsg = error.response.data.error.message
    }
  } else if (error.request) {
    errorMsg = error.request
  } else {
  }

  displayError(errorMsg)
}

export default catchErrors
