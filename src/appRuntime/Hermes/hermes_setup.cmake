# Hermes setup: fetches the static_h branch of facebook/hermes.

include(FetchContent)

set(HERMES_BUILD_APPLE_FRAMEWORK OFF CACHE BOOL "" FORCE)
set(HERMES_BUILD_APPLE_TESTS     OFF CACHE BOOL "" FORCE)
set(HERMES_ENABLE_DEBUGGER       OFF CACHE BOOL "" FORCE)
# Tools (incl. hermesc) MUST be ON — internal JS bytecode generation needs it.
set(HERMES_ENABLE_TOOLS          ON  CACHE BOOL "" FORCE)
set(HERMES_ENABLE_TEST_SUITE     OFF CACHE BOOL "" FORCE)
set(HERMES_ENABLE_INTL           OFF CACHE BOOL "" FORCE)
set(HERMES_ENABLE_NAPI           OFF CACHE BOOL "" FORCE)
set(HERMES_BUILD_NODE_HERMES     OFF CACHE BOOL "" FORCE)
set(HERMES_BUILD_SHARED_JSI      OFF CACHE BOOL "" FORCE)
set(HERMES_USE_STATIC_ICU        OFF CACHE BOOL "" FORCE)
set(HERMES_IS_ANDROID            OFF CACHE BOOL "" FORCE)
set(HERMES_ENABLE_CONTRIB_EXTENSIONS OFF CACHE BOOL "" FORCE)
set(HERMES_UNICODE_LITE          ON  CACHE BOOL "" FORCE)
set(JSI_UNSTABLE                 ON  CACHE BOOL "" FORCE)

FetchContent_Declare(
  hermes
  GIT_REPOSITORY https://github.com/facebook/hermes.git
  GIT_TAG        static_h
  GIT_SHALLOW    TRUE
)

FetchContent_GetProperties(hermes)
if(NOT hermes_POPULATED)
  message(STATUS "Cloning Hermes (static_h branch)...")
  FetchContent_MakeAvailable(hermes)
endif()

