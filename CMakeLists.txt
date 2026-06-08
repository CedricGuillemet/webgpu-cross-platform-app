cmake_minimum_required(VERSION 3.22)
project(app LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---- JavaScript engine selection ----
set(JS_ENGINE "Chakra" CACHE STRING "JavaScript engine to use: Chakra, QuickJS, V8, Hermes or JSC")
set_property(CACHE JS_ENGINE PROPERTY STRINGS Chakra QuickJS V8 Hermes JSC)
if(NOT JS_ENGINE STREQUAL "Chakra" AND NOT JS_ENGINE STREQUAL "QuickJS"
   AND NOT JS_ENGINE STREQUAL "V8"     AND NOT JS_ENGINE STREQUAL "Hermes"
   AND NOT JS_ENGINE STREQUAL "JSC")
  message(FATAL_ERROR "JS_ENGINE must be Chakra, QuickJS, V8, Hermes or JSC, got: ${JS_ENGINE}")
endif()
message(STATUS "JavaScript engine: ${JS_ENGINE}")

# ---- Graphics API (Dawn backend) selection ----
set(GRAPHICS_API "D3D12" CACHE STRING "Dawn backend to use: D3D12, D3D11, Vulkan, OpenGLES or Metal")
set_property(CACHE GRAPHICS_API PROPERTY STRINGS D3D12 D3D11 Vulkan OpenGLES Metal)
if(NOT GRAPHICS_API STREQUAL "D3D12" AND NOT GRAPHICS_API STREQUAL "D3D11"
   AND NOT GRAPHICS_API STREQUAL "Vulkan" AND NOT GRAPHICS_API STREQUAL "OpenGLES"
   AND NOT GRAPHICS_API STREQUAL "Metal")
  message(FATAL_ERROR "GRAPHICS_API must be D3D12, D3D11, Vulkan, OpenGLES or Metal, got: ${GRAPHICS_API}")
endif()
message(STATUS "Graphics API: ${GRAPHICS_API}")

# ---- Global size-reducing flags ----
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
endif()
# MSVC: /O1 = size, /Gy = function-level linking (enables /OPT:REF effectively),
# /GL = whole-program optimization (LTO), /Gw = data COMDAT folding,
# /Zc:inline = strip unreferenced inline functions, /utf-8 = consistent encoding.
if(MSVC)
  add_compile_options(/O1 /Gy /Gw /GL /Zc:inline)
  add_link_options(/LTCG /OPT:REF /OPT:ICF /INCREMENTAL:NO /DEBUG:NONE)
endif()

# ---- Dawn: disable every backend / feature we don't use ----
# These must be set BEFORE add_subdirectory(dawn) so they reach Dawn's own options.
set(DAWN_FETCH_DEPENDENCIES ON)

if(ANDROID)
  # Android: D3D doesn't exist. Allow Vulkan or OpenGLES; default Vulkan.
  if(NOT GRAPHICS_API STREQUAL "Vulkan" AND NOT GRAPHICS_API STREQUAL "OpenGLES")
    message(STATUS "Android target: overriding GRAPHICS_API to Vulkan (was ${GRAPHICS_API})")
    set(GRAPHICS_API Vulkan)
  endif()
  set(DAWN_ENABLE_D3D11   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_D3D12   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_METAL   OFF CACHE BOOL "" FORCE)
  if(GRAPHICS_API STREQUAL "OpenGLES")
    set(DAWN_ENABLE_VULKAN   OFF CACHE BOOL "" FORCE)
    set(DAWN_ENABLE_OPENGLES ON  CACHE BOOL "" FORCE)
  else()
    set(DAWN_ENABLE_VULKAN   ON  CACHE BOOL "" FORCE)
    set(DAWN_ENABLE_OPENGLES OFF CACHE BOOL "" FORCE)
  endif()
elseif(GRAPHICS_API STREQUAL "D3D12")
  set(DAWN_ENABLE_D3D11   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_D3D12   ON  CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_VULKAN  OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_METAL   OFF CACHE BOOL "" FORCE)
elseif(GRAPHICS_API STREQUAL "D3D11")
  set(DAWN_ENABLE_D3D11   ON  CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_D3D12   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_VULKAN  OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_METAL   OFF CACHE BOOL "" FORCE)
elseif(GRAPHICS_API STREQUAL "OpenGLES")
  set(DAWN_ENABLE_D3D11    OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_D3D12    OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_VULKAN   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_OPENGLES ON  CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_METAL    OFF CACHE BOOL "" FORCE)
elseif(GRAPHICS_API STREQUAL "Metal")
  set(DAWN_ENABLE_D3D11   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_D3D12   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_VULKAN  OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_METAL   ON  CACHE BOOL "" FORCE)
else()  # Vulkan
  set(DAWN_ENABLE_D3D11   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_D3D12   OFF CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_VULKAN  ON  CACHE BOOL "" FORCE)
  set(DAWN_ENABLE_METAL   OFF CACHE BOOL "" FORCE)
endif()
set(DAWN_ENABLE_NULL    OFF CACHE BOOL "" FORCE)
set(DAWN_ENABLE_DESKTOP_GL  OFF CACHE BOOL "" FORCE)
# OPENGLES and METAL are set above (per-platform)
set(DAWN_ENABLE_WEBGPU_ON_WEBGPU OFF CACHE BOOL "" FORCE)
set(DAWN_ENABLE_SPIRV_VALIDATION OFF CACHE BOOL "" FORCE)
set(DAWN_USE_GLFW       OFF CACHE BOOL "" FORCE)
set(DAWN_USE_WAYLAND    OFF CACHE BOOL "" FORCE)
set(DAWN_USE_X11        OFF CACHE BOOL "" FORCE)
set(DAWN_USE_WINDOWS_UI OFF CACHE BOOL "" FORCE)
set(DAWN_BUILD_SAMPLES  OFF CACHE BOOL "" FORCE)
set(DAWN_BUILD_TESTS    OFF CACHE BOOL "" FORCE)
set(DAWN_BUILD_BENCHMARKS OFF CACHE BOOL "" FORCE)
set(DAWN_BUILD_FUZZERS  OFF CACHE BOOL "" FORCE)
set(DAWN_BUILD_PROTOBUF OFF CACHE BOOL "" FORCE)
set(DAWN_BUILD_NODE_BINDINGS OFF CACHE BOOL "" FORCE)
set(DAWN_ENABLE_SWIFTSHADER  OFF CACHE BOOL "" FORCE)
set(DAWN_ENABLE_INSTALL OFF CACHE BOOL "" FORCE)
set(DAWN_USE_BUILT_DXC OFF CACHE BOOL "" FORCE)

# Tint: only ship the writer(s) the chosen backend actually needs.
# D3D11/D3D12 consume HLSL; Vulkan consumes SPIR-V.
set(TINT_BUILD_CMD_TOOLS  OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_TESTS      OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_DOCS       OFF CACHE BOOL "" FORCE)
set(TINT_ENABLE_INSTALL   OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_WGSL_READER ON  CACHE BOOL "" FORCE)
# WGSL_WRITER is only needed for round-tripping (debug). Runtime path is
# WGSL → IR → SPV (Vulkan) / HLSL (D3D). Skip the writer to shave .text.
set(TINT_BUILD_WGSL_WRITER OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_SPV_READER  OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_GLSL_WRITER OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_GLSL_VALIDATOR OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_MSL_WRITER  OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_IR_BINARY   OFF CACHE BOOL "" FORCE)
set(TINT_BUILD_SYNTAX_TREE_WRITER OFF CACHE BOOL "" FORCE)
if(GRAPHICS_API STREQUAL "Vulkan")
  set(TINT_BUILD_HLSL_WRITER OFF CACHE BOOL "" FORCE)
  set(TINT_BUILD_SPV_WRITER  ON  CACHE BOOL "" FORCE)
elseif(GRAPHICS_API STREQUAL "OpenGLES")
  # Dawn's OpenGL ES backend consumes GLSL. Re-enable the GLSL writer +
  # validator (off by default in this project).
  set(TINT_BUILD_HLSL_WRITER OFF CACHE BOOL "" FORCE)
  set(TINT_BUILD_SPV_WRITER  OFF CACHE BOOL "" FORCE)
  set(TINT_BUILD_GLSL_WRITER ON  CACHE BOOL "" FORCE)
  set(TINT_BUILD_GLSL_VALIDATOR ON CACHE BOOL "" FORCE)
elseif(GRAPHICS_API STREQUAL "Metal")
  # Dawn's Metal backend consumes MSL.
  set(TINT_BUILD_HLSL_WRITER OFF CACHE BOOL "" FORCE)
  set(TINT_BUILD_SPV_WRITER  OFF CACHE BOOL "" FORCE)
  set(TINT_BUILD_MSL_WRITER  ON  CACHE BOOL "" FORCE)
else()  # D3D11 or D3D12
  set(TINT_BUILD_HLSL_WRITER ON  CACHE BOOL "" FORCE)
  set(TINT_BUILD_SPV_WRITER  OFF CACHE BOOL "" FORCE)
endif()

add_subdirectory("dawn" EXCLUDE_FROM_ALL)

# ---- JavaScript engine: Chakra or QuickJS ----
if(JS_ENGINE STREQUAL "Chakra")
  set(CHAKRACORE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../chakracore" CACHE PATH "Path to ChakraCore NuGet root")
  if(NOT EXISTS "${CHAKRACORE_DIR}/build/native/include/ChakraCore.h")
    message(FATAL_ERROR "ChakraCore not found at ${CHAKRACORE_DIR}")
  endif()
  add_library(chakracore SHARED IMPORTED)
  set_target_properties(chakracore PROPERTIES
    IMPORTED_IMPLIB "${CHAKRACORE_DIR}/lib/native/v140/x64/release/ChakraCore.lib"
    IMPORTED_LOCATION "${CHAKRACORE_DIR}/lib/native/v140/x64/release/ChakraCore.dll"
    INTERFACE_INCLUDE_DIRECTORIES "${CHAKRACORE_DIR}/build/native/include"
  )
elseif(JS_ENGINE STREQUAL "QuickJS")
  include(FetchContent)
  FetchContent_Declare(
    quickjs
    GIT_REPOSITORY https://github.com/quickjs-ng/quickjs.git
    GIT_TAG        v0.10.0
    GIT_SHALLOW    TRUE
  )
  # quickjs-ng's CMake builds an exe + tests by default; disable them.
  set(BUILD_QJS_LIBC OFF CACHE BOOL "" FORCE)
  set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
  set(BUILD_STATIC_QJS_EXE OFF CACHE BOOL "" FORCE)
  set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
  FetchContent_MakeAvailable(quickjs)
elseif(JS_ENGINE STREQUAL "V8")
  include("${CMAKE_CURRENT_SOURCE_DIR}/src/appRuntime/V8/v8_setup.cmake")
elseif(JS_ENGINE STREQUAL "Hermes")
  include("${CMAKE_CURRENT_SOURCE_DIR}/src/appRuntime/Hermes/hermes_setup.cmake")
elseif(JS_ENGINE STREQUAL "JSC")
  include("${CMAKE_CURRENT_SOURCE_DIR}/src/appRuntime/JSC/jsc_setup.cmake")
endif()

# ---- Framework: OS-specific primitives (image decode, window, http, fs) ----
if(ANDROID)
  set(FRAMEWORK_SOURCES
    "src/framework/android/image_decoder.cpp"
    "src/framework/android/image_decoder.h"
    "src/framework/android/native_window.cpp"
    "src/framework/android/native_window.h"
    "src/framework/android/http_fetcher.cpp"
    "src/framework/android/http_fetcher.h"
    "src/framework/android/fs_loader.cpp"
    "src/framework/android/fs_loader.h"
  )
  set(FRAMEWORK_INCLUDE_DIR "src/framework/android")
else()
  set(FRAMEWORK_SOURCES
    "src/framework/win32/image_decoder.cpp"
    "src/framework/win32/image_decoder.h"
    "src/framework/win32/native_window.cpp"
    "src/framework/win32/native_window.h"
    "src/framework/win32/http_fetcher.cpp"
    "src/framework/win32/http_fetcher.h"
    "src/framework/win32/fs_loader.cpp"
    "src/framework/win32/fs_loader.h"
  )
  set(FRAMEWORK_INCLUDE_DIR "src/framework/win32")
endif()

# ---- Shared appRuntime: engine-agnostic application layer ----
# These files use only the cx::Host facade + the Chakra-style Js* C API
# (which Chakra exposes natively and other engines expose via chakra_compat).
set(APPRUNTIME_SHARED
  "src/appRuntime/Shared/wgpu_bridge.cpp"
  "src/appRuntime/Shared/wgpu_bridge.h"
  "src/appRuntime/Shared/wgpu_enums.cpp"
  "src/appRuntime/Shared/wgpu_enums.h"
  "src/appRuntime/Shared/dom_shim.cpp"
  "src/appRuntime/Shared/dom_shim.h"
  "src/appRuntime/Shared/worker_shim.cpp"
  "src/appRuntime/Shared/worker_shim.h"
)

# ---- App runtime: JS engine-specific sources ----
if(JS_ENGINE STREQUAL "Chakra")
  set(APPRUNTIME_DIR "src/appRuntime/Chakra")
  set(APPRUNTIME_SOURCES
    "${APPRUNTIME_DIR}/chakra_host.cpp"
    "${APPRUNTIME_DIR}/chakra_host.h"
  )
elseif(JS_ENGINE STREQUAL "QuickJS")
  set(APPRUNTIME_DIR "src/appRuntime/QuickJS")
  set(APPRUNTIME_SOURCES
    "${APPRUNTIME_DIR}/chakra_compat.cpp"
    "${APPRUNTIME_DIR}/chakra_compat.h"
    "${APPRUNTIME_DIR}/chakra_host.cpp"
    "${APPRUNTIME_DIR}/chakra_host.h"
  )
elseif(JS_ENGINE STREQUAL "V8")
  set(APPRUNTIME_DIR "src/appRuntime/V8")
  set(APPRUNTIME_SOURCES
    "${APPRUNTIME_DIR}/chakra_compat.cpp"
    "${APPRUNTIME_DIR}/chakra_compat.h"
    "${APPRUNTIME_DIR}/chakra_host.cpp"
    "${APPRUNTIME_DIR}/chakra_host.h"
  )
elseif(JS_ENGINE STREQUAL "Hermes")
  set(APPRUNTIME_DIR "src/appRuntime/Hermes")
  set(APPRUNTIME_SOURCES
    "${APPRUNTIME_DIR}/chakra_compat.cpp"
    "${APPRUNTIME_DIR}/chakra_compat.h"
    "${APPRUNTIME_DIR}/chakra_host.cpp"
    "${APPRUNTIME_DIR}/chakra_host.h"
  )
elseif(JS_ENGINE STREQUAL "JSC")
  set(APPRUNTIME_DIR "src/appRuntime/JSC")
  set(APPRUNTIME_SOURCES
    "${APPRUNTIME_DIR}/chakra_compat.cpp"
    "${APPRUNTIME_DIR}/chakra_compat.h"
    "${APPRUNTIME_DIR}/chakra_host.cpp"
    "${APPRUNTIME_DIR}/chakra_host.h"
  )
endif()

if(ANDROID)
  set(APP_SOURCES
    "src/platform/android/android_app.cpp"
    "src/platform/android/android_app.h"
    "src/platform/android/jni_bridge.cpp"
    ${FRAMEWORK_SOURCES}
    ${APPRUNTIME_SHARED}
    ${APPRUNTIME_SOURCES}
  )
else()
  set(APP_SOURCES
    "main.cpp"
    ${FRAMEWORK_SOURCES}
    ${APPRUNTIME_SHARED}
    ${APPRUNTIME_SOURCES}
  )
endif()

if(ANDROID)
  add_library(app SHARED ${APP_SOURCES})
  set_target_properties(app PROPERTIES OUTPUT_NAME "dawntest")
  # ---- Size-reduction compile/link flags (Release only) ----
  # -Oz : optimize for size more aggressively than -Os
  # -fvisibility=*=hidden : only export symbols explicitly marked JNICALL
  # -ffunction-sections / -fdata-sections + --gc-sections : drop unused code
  # -fno-rtti : drop typeinfo tables (Dawn/Tint don't rely on dynamic_cast)
  # -fmerge-all-constants : merge duplicate string literals
  # -fno-asynchronous-unwind-tables : keep .eh_frame minimal (still able to
  #     unwind for exceptions because -fexceptions emits its own tables)
  # -flto=thin : whole-program optimisation across translation units
  target_compile_options(app PRIVATE
    $<$<CONFIG:Release>:-Oz -flto=thin
                         -fvisibility=hidden -fvisibility-inlines-hidden
                         -ffunction-sections -fdata-sections
                         -fmerge-all-constants -fno-rtti
                         -fno-asynchronous-unwind-tables -fno-unwind-tables>)
  target_link_options(app PRIVATE
    $<$<CONFIG:Release>:-Wl,--gc-sections -Wl,--icf=all -flto=thin -Wl,-s
                         -Wl,--version-script=${CMAKE_CURRENT_SOURCE_DIR}/src/platform/android/libdawntest.map
                         -Wl,--exclude-libs,ALL>)
else()
  add_executable(app ${APP_SOURCES})
endif()
target_include_directories(app PRIVATE
  "src"
  "${FRAMEWORK_INCLUDE_DIR}"
  "src/appRuntime/Shared"
  "${APPRUNTIME_DIR}"
)
# Compile-time backend selection so wgpu_bridge can pick the right
# wgpu::BackendType in RequestAdapter without runtime branches.
target_compile_definitions(app PRIVATE
  $<$<STREQUAL:${GRAPHICS_API},Vulkan>:DAWNTEST_BACKEND_VULKAN=1>
  $<$<STREQUAL:${GRAPHICS_API},OpenGLES>:DAWNTEST_BACKEND_OPENGLES=1>
  $<$<STREQUAL:${GRAPHICS_API},D3D12>:DAWNTEST_BACKEND_D3D12=1>
  $<$<STREQUAL:${GRAPHICS_API},D3D11>:DAWNTEST_BACKEND_D3D11=1>
  $<$<STREQUAL:${GRAPHICS_API},Metal>:DAWNTEST_BACKEND_METAL=1>
)
)
if(ANDROID)
  target_include_directories(app PRIVATE
    "src/platform/android"
  )
endif()

if(JS_ENGINE STREQUAL "Chakra")
  target_compile_definitions(app PRIVATE JS_ENGINE_CHAKRA=1)
  if(ANDROID)
    message(FATAL_ERROR "Chakra is Windows-only; pick QuickJS for Android")
  endif()
  target_link_libraries(app PRIVATE
    webgpu_dawn chakracore
    winhttp user32 gdi32
    windowscodecs ole32
  )
  add_custom_command(TARGET app POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
      "${CHAKRACORE_DIR}/lib/native/v140/x64/release/ChakraCore.dll"
      "$<TARGET_FILE_DIR:app>/ChakraCore.dll"
  )
elseif(JS_ENGINE STREQUAL "QuickJS")
  target_compile_definitions(app PRIVATE JS_ENGINE_QUICKJS=1)
  if(ANDROID)
    target_link_libraries(app PRIVATE
      webgpu_dawn qjs
      android log jnigraphics
    )
    # ---- Strip SPIRV-Tools-shared from the APK ----
    # Dawn statically links to SPIRV-Tools-static for itself, but SPIRV-Tools
    # also builds a SHARED variant that gets dropped into the build dir and
    # gradle then packages it. Mark the shared target EXCLUDE_FROM_ALL so it
    # never gets built / packaged.
    if(TARGET SPIRV-Tools-shared)
      set_target_properties(SPIRV-Tools-shared PROPERTIES EXCLUDE_FROM_ALL TRUE)
    endif()
  else()
    target_link_libraries(app PRIVATE
      webgpu_dawn qjs
      winhttp user32 gdi32
      windowscodecs ole32
    )
    if(MSVC)
      target_link_options(app PRIVATE /STACK:16777216)
    endif()
  endif()
elseif(JS_ENGINE STREQUAL "V8")
  target_compile_definitions(app PRIVATE JS_ENGINE_V8=1)
  target_link_libraries(app PRIVATE
    webgpu_dawn v8
    winhttp user32 gdi32
    windowscodecs ole32
  )
  if(MSVC)
    target_link_options(app PRIVATE /STACK:16777216)
  endif()
  # Copy v8 runtime DLLs + ICU data next to app.exe
  foreach(_v8file ${V8_REDIST_DLLS})
    add_custom_command(TARGET app POST_BUILD
      COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${_v8file}" "$<TARGET_FILE_DIR:app>/")
  endforeach()
elseif(JS_ENGINE STREQUAL "Hermes")
  target_compile_definitions(app PRIVATE JS_ENGINE_HERMES=1)
  # hermesvm_a is the STATIC aggregate; hermesvm is the SHARED .dll wrapper.
  # Use the static one so app.exe has no Hermes DLL dependency.
  target_link_libraries(app PRIVATE
    webgpu_dawn
    hermesvm_a
    jsi
    winhttp user32 gdi32
    windowscodecs ole32
  )
  if(MSVC)
    target_link_options(app PRIVATE /STACK:16777216)
  endif()
elseif(JS_ENGINE STREQUAL "JSC")
  target_compile_definitions(app PRIVATE JS_ENGINE_JSC=1)
  if(WIN32 OR ANDROID)
    message(FATAL_ERROR "JSC backend is not wired for Windows/Android in this fork")
  endif()
  target_link_libraries(app PRIVATE
    webgpu_dawn
    jsc
  )
  if(APPLE)
    # CoreFoundation/Foundation are pulled in transitively by
    # JavaScriptCore.framework; nothing extra to link.
  elseif(UNIX)
    # libjavascriptcoregtk on Linux brings glib/dl etc. via pkg-config.
    target_link_libraries(app PRIVATE pthread dl m)
  endif()
endif()

if(NOT ANDROID)
  # Make js/ and assets/ available next to the binary. On Android the assets
  # are bundled via the AAR/APK packaging step (Gradle copies them into
  # app/src/main/assets/) so this step is skipped.
  add_custom_command(TARGET app POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
      "${CMAKE_CURRENT_SOURCE_DIR}/js"
      "$<TARGET_FILE_DIR:app>/js"
  )
  add_custom_command(TARGET app POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
      "${CMAKE_CURRENT_SOURCE_DIR}/assets"
      "$<TARGET_FILE_DIR:app>/assets"
  )
endif()
