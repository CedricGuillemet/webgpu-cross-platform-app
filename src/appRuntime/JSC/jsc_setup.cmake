# JSC engine setup: link against Apple's system JavaScriptCore.framework on
# macOS / iOS, or libjavascriptcoregtk-4.1 on Linux. Windows + Android are
# not supported (no readily-available JSC binary; WebKit-on-Windows is not a
# reasonable dep for this project, and android-jsc.aar packaging is
# orthogonal and would need its own wiring).

if(APPLE)
  # System framework — already on every macOS / iOS / iPadOS / tvOS install.
  add_library(jsc INTERFACE IMPORTED GLOBAL)
  set_target_properties(jsc PROPERTIES
    INTERFACE_LINK_LIBRARIES "-framework JavaScriptCore"
  )
  set(JSC_AVAILABLE TRUE PARENT_SCOPE)
elseif(UNIX AND NOT ANDROID)
  # Linux: pkg-config javascriptcoregtk-4.1 (apt-get install
  # libjavascriptcoregtk-4.1-dev).
  find_package(PkgConfig)
  if(PkgConfig_FOUND)
    pkg_check_modules(JSC IMPORTED_TARGET javascriptcoregtk-4.1)
    if(JSC_FOUND)
      add_library(jsc INTERFACE IMPORTED GLOBAL)
      set_target_properties(jsc PROPERTIES
        INTERFACE_LINK_LIBRARIES "PkgConfig::JSC"
      )
      set(JSC_AVAILABLE TRUE PARENT_SCOPE)
    else()
      pkg_check_modules(JSC IMPORTED_TARGET javascriptcoregtk-4.0)
      if(JSC_FOUND)
        add_library(jsc INTERFACE IMPORTED GLOBAL)
        set_target_properties(jsc PROPERTIES
          INTERFACE_LINK_LIBRARIES "PkgConfig::JSC"
        )
        set(JSC_AVAILABLE TRUE PARENT_SCOPE)
      else()
        message(FATAL_ERROR
          "JSC requested but libjavascriptcoregtk-4.{0,1}-dev not found. "
          "Install with: sudo apt-get install libjavascriptcoregtk-4.1-dev")
      endif()
    endif()
  else()
    message(FATAL_ERROR "JSC requires pkg-config to locate libjavascriptcoregtk")
  endif()
else()
  message(FATAL_ERROR
    "JSC backend is not available on this platform "
    "(Windows + Android not wired in this fork).")
endif()
