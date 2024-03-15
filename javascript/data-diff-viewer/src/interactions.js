export function toggleShowSchema(showSchemaButton) {
  showSchemaButton.classList.toggle("active")
  var content = showSchemaButton.nextElementSibling
  if (content.style.display === "block") {
    content.style.display = "none"
  } else {
    content.style.display = "block"
  }
}

/**********************************************************/
var bool_toggleHideColumnsWithNoChange = false
var bool_toggleExpandAllDetails = false

function _updateVisibility(element) {
  var should_display = true
  if (element.classList.contains("details") && !bool_toggleExpandAllDetails) {
    should_display = false
  }
  if (element.classList.contains("no_change") && bool_toggleHideColumnsWithNoChange) {
    should_display = false
  }

  if (should_display) {
    element.style.display = 'table-row'
  }
  else {
    element.style.display = 'none'
  }

}

export function toggleHideColumnsWithNoChange() {
  // Get the button element
  let button = document.querySelector('.button_toggleHideColumnsWithNoChange')

  let noChangeElements = document.querySelectorAll('.no_change')

  // Check if the button has the "active" class
  if (bool_toggleHideColumnsWithNoChange) {
    bool_toggleHideColumnsWithNoChange = false
    button.classList.remove('active')
  } else {
    bool_toggleHideColumnsWithNoChange = true
    button.classList.add('active')
  }
  noChangeElements.forEach(_updateVisibility)
}

export function toggleColumnDetails(columnName) {
  // Get all the no_change elements
  let detailsElements = document.querySelectorAll('.details')
  // Toggle their visibility
  for (let element of detailsElements) {
    if (element.getAttribute('column_name') == columnName) {
      if (element.style.display != 'table-row') {
        element.style.display = 'table-row'
      } else {
        element.style.display = 'none'
      }
    }
  }
}

export function toggleExpandAllDetails(columnName) {
  // Get the button element
  let button = document.querySelector('.button_toggleExpandAllDetails')
  let detailsElements = document.querySelectorAll('.details')


  // Check if the button has the "active" class
  if (bool_toggleExpandAllDetails) {
    bool_toggleExpandAllDetails = false
    button.classList.remove('active')
  } else {
    bool_toggleExpandAllDetails = true
    button.classList.add('active')
  }
  detailsElements.forEach(_updateVisibility)
}
