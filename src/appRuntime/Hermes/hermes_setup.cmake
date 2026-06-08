# Hermes setup: fetches the static_h branch of facebook/hermes.

include(FetchContent)

set(HERMES_BUILD_APPLE_FRAMEWORK OFF CACHE BOOL "" FORCE)
set(HERMES_BUILD_APPLE_TESTS     OFF CACHE BOOL "" FORCE)
set(HERMES_ENABLE_DEBUGGER       OFF CACHE BOOL "" FORCE)
# Tools (incl. hermesc) MUST be ON — internal JS bytecode generation needs it.
# On Android cross-builds CMake refuses to add an x86_64 host tool target to
# an arm64 NDK build, so we'll set this OFF below for ANDROID and use a
# pre-built hermesc via an external var if available.
set(HERMES_ENABLE_TOOLS          ON  CACHE BOOL "" FORCE)
set(HERMES_ENABLE_TEST_SUITE     OFF CACHE BOOL "" FORCE)
set(HERMES_ENABLE_INTL           OFF CACHE BOOL "" FORCE)
set(HERMES_ENABLE_NAPI           OFF CACHE BOOL "" FORCE)
set(HERMES_BUILD_NODE_HERMES     OFF CACHE BOOL "" FORCE)
set(HERMES_BUILD_SHARED_JSI      OFF CACHE BOOL "" FORCE)
set(HERMES_USE_STATIC_ICU        OFF CACHE BOOL "" FORCE)
set(HERMES_ENABLE_CONTRIB_EXTENSIONS OFF CACHE BOOL "" FORCE)
set(HERMES_UNICODE_LITE          ON  CACHE BOOL "" FORCE)
set(JSI_UNSTABLE                 ON  CACHE BOOL "" FORCE)

if(ANDROID)
    # NB: do NOT set HERMES_IS_ANDROID — that flag tells Hermes to build the
    # React-Native fbjni JNI bridge, which we don't link against. Leaving it
    # OFF gives us a plain Hermes VM static lib that exposes only the JSI C++
    # surface — which is exactly what our chakra_host translation layer wants.
    set(HERMES_IS_ANDROID        OFF CACHE BOOL "" FORCE)
    # hermesc is a host tool that must run on the build machine; cross-compiling
    # it as an NDK target fails. Hermes' build system uses an "imported"
    # hermesc binary when IMPORT_HERMESC is set to a host-built one. For CI
    # we point it at the runner's system hermesc via a separate build step.
    if(DEFINED IMPORT_HERMESC AND EXISTS "${IMPORT_HERMESC}")
        message(STATUS "Using pre-built hermesc: ${IMPORT_HERMESC}")
    else()
        message(WARNING
            "ANDROID Hermes build needs a host hermesc; pass -DIMPORT_HERMESC=<path> "
            "or build hermes-tools natively first")
    endif()
else()
    set(HERMES_IS_ANDROID        OFF CACHE BOOL "" FORCE)
endif()

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

