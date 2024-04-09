export function toggleShowSchema(showSchemaButton) {
  showSchemaButton.classList.toggle("active");
  var content = showSchemaButton.nextElementSibling;
  if (content.style.display === "block") {
    content.style.display = "none";
  } else {
    content.style.display = "block";
  }
}

/**********************************************************/
var bool_toggleHideColumnsWithNoChange = false;
var bool_toggleExpandAllDetails = false;

function _updateHidden(element) {
  var should_hide = bool_toggleHideColumnsWithNoChange;
  if (should_hide) {
    element.classList.add("hidden");
  } else {
    element.classList.remove("hidden");
  }
}

function _updateCollapsed(element) {
  var should_collapse = !bool_toggleExpandAllDetails;
  if (should_collapse) {
    element.classList.add("collapsed");
  } else {
    element.classList.remove("collapsed");
  }
}

export function toggleHideColumnsWithNoChange() {
  // Get the button element
  let button = document.querySelector(".button_toggleHideColumnsWithNoChange");

  let noChangeElements = document.querySelectorAll(".no_change");

  // Check if the button has the "active" class
  if (bool_toggleHideColumnsWithNoChange) {
    bool_toggleHideColumnsWithNoChange = false;
    button.classList.remove("active");
  } else {
    bool_toggleHideColumnsWithNoChange = true;
    button.classList.add("active");
  }
  noChangeElements.forEach(_updateHidden);
}

export function toggleColumnDetails(columnName) {
  // Get all the no_change elements
  let detailsElements = document.querySelectorAll(".details");
  // Toggle their visibility
  for (let element of detailsElements) {
    if (element.getAttribute("column_name") === columnName) {
      if (!element.classList.contains("collapsed")) {
        element.classList.add("collapsed");
      } else {
        element.classList.remove("collapsed");
      }
    }
  }
}

export function toggleExpandAllDetails(columnName) {
  // Get the button element
  let button = document.querySelector(".button_toggleExpandAllDetails");
  let detailsElements = document.querySelectorAll(".details");

  // Check if the button has the "active" class
  if (bool_toggleExpandAllDetails) {
    bool_toggleExpandAllDetails = false;
    button.classList.remove("active");
  } else {
    bool_toggleExpandAllDetails = true;
    button.classList.add("active");
  }
  detailsElements.forEach(_updateCollapsed);
}
