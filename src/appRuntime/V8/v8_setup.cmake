# V8 setup:
#   - Windows: downloads the v8-v143-x64 + v8.redist-v143-x64 NuGet packages
#     (the same approach JsRuntimeHost uses), then exposes them as imported
#     CMake targets `v8`, `v8_libbase`, `v8_libplatform`. Records redist
#     DLLs in V8_REDIST_DLLS so the parent CMake can copy them next to
#     the exe.
#   - Android: fetches @babylonjs/v8-android-jit-nointl-nosnapshot via npm,
#     extracts the per-ABI .aar, and exposes a single `v8` imported SHARED
#     library backed by libv8android.so. Mirrors
#     BabylonJS/JsRuntimeHost/Core/Node-API/CMakeLists.txt's V8 + ANDROID
#     branch.

if(ANDROID)
    set(V8_PACKAGE_BASE_NAME "v8-android-jit-nointl-nosnapshot")
    set(V8_PACKAGE_NAME "@babylonjs/${V8_PACKAGE_BASE_NAME}")
    set(V8_PACKAGE_VERSION "11.110.1")
    set(V8_ANDROID_DIR "${CMAKE_BINARY_DIR}/${V8_PACKAGE_BASE_NAME}")

    find_program(NPM_EXECUTABLE npm REQUIRED)

    if(NOT EXISTS "${V8_ANDROID_DIR}/include/v8.h")
        file(MAKE_DIRECTORY "${V8_ANDROID_DIR}")
        # Write a minimal package.json so npm install drops the AAR + headers.
        file(WRITE "${V8_ANDROID_DIR}/package.json"
            "{\"dependencies\":{\"${V8_PACKAGE_NAME}\":\"${V8_PACKAGE_VERSION}\"}}\n")
        message(STATUS "npm install ${V8_PACKAGE_NAME}@${V8_PACKAGE_VERSION} ...")
        execute_process(
            COMMAND ${NPM_EXECUTABLE} install --no-package-lock --silent
            WORKING_DIRECTORY "${V8_ANDROID_DIR}"
            RESULT_VARIABLE _rc)
        if(NOT _rc EQUAL 0)
            message(FATAL_ERROR "npm install ${V8_PACKAGE_NAME} failed (rc=${_rc})")
        endif()

        file(GLOB_RECURSE _aar
            "${V8_ANDROID_DIR}/node_modules/${V8_PACKAGE_NAME}/dist/org/chromium/*.aar")
        if(NOT _aar)
            message(FATAL_ERROR "Could not locate ${V8_PACKAGE_NAME} .aar after npm install")
        endif()
        file(ARCHIVE_EXTRACT INPUT ${_aar}
             DESTINATION "${V8_ANDROID_DIR}"
             PATTERNS jni)

        file(COPY "${V8_ANDROID_DIR}/node_modules/${V8_PACKAGE_NAME}/dist/include"
             DESTINATION "${V8_ANDROID_DIR}")
        message(STATUS "Extracted ${V8_PACKAGE_NAME} -> ${V8_ANDROID_DIR}")
    endif()

    set(V8_SO_PATH "${V8_ANDROID_DIR}/jni/${ANDROID_ABI}/libv8android.so")
    if(NOT EXISTS "${V8_SO_PATH}")
        message(FATAL_ERROR "libv8android.so not found for ABI ${ANDROID_ABI} at ${V8_SO_PATH}")
    endif()

    add_library(v8 SHARED IMPORTED GLOBAL)
    set_target_properties(v8 PROPERTIES
        IMPORTED_LOCATION "${V8_SO_PATH}"
        INTERFACE_INCLUDE_DIRECTORIES "${V8_ANDROID_DIR}/include")
    # Match the build defines used by the Chromium Android build of V8.
    target_compile_definitions(v8 INTERFACE
        V8_COMPRESS_POINTERS=1
        V8_31BIT_SMIS_ON_64BIT_ARCH=1
        V8_ENABLE_SANDBOX=1)

    # No DLLs to copy on Android; AGP packages the .so via JNI dir.
    set(V8_REDIST_DLLS "")
    return()
endif()

# --- Windows path (original NuGet flow) -------------------------------------

set(V8_VERSION "11.9.169.4")

set(NUGET_PATH "${CMAKE_BINARY_DIR}/NuGet")
set(NUGET_EXE "${NUGET_PATH}/nuget.exe")
if(NOT EXISTS "${NUGET_EXE}")
  message(STATUS "Downloading nuget.exe to ${NUGET_EXE}")
  file(DOWNLOAD "https://dist.nuget.org/win-x86-commandline/latest/nuget.exe" "${NUGET_EXE}")
endif()

file(COPY "${CMAKE_CURRENT_LIST_DIR}/nuget.config"    DESTINATION "${NUGET_PATH}")
file(COPY "${CMAKE_CURRENT_LIST_DIR}/packages.config" DESTINATION "${NUGET_PATH}")

set(V8_PACKAGE_PATH        "${NUGET_PATH}/packages/v8-v143-x64.${V8_VERSION}")
set(V8_REDIST_PACKAGE_PATH "${NUGET_PATH}/packages/v8.redist-v143-x64.${V8_VERSION}")

if(NOT EXISTS "${V8_PACKAGE_PATH}/include/v8.h")
  message(STATUS "Restoring V8 NuGet packages (this may take a minute)...")
  execute_process(COMMAND "${NUGET_EXE}" restore
                  WORKING_DIRECTORY "${NUGET_PATH}"
                  RESULT_VARIABLE _restore_rc)
  execute_process(COMMAND "${NUGET_EXE}" install -OutputDirectory packages
                  WORKING_DIRECTORY "${NUGET_PATH}"
                  RESULT_VARIABLE _install_rc)
  if(NOT EXISTS "${V8_PACKAGE_PATH}/include/v8.h")
    message(FATAL_ERROR "Failed to download V8 NuGet packages (rc=${_install_rc}). "
                        "Check internet access and that v8-v143-x64 ${V8_VERSION} exists on NuGet.org.")
  endif()
endif()

message(STATUS "V8 package at: ${V8_PACKAGE_PATH}")

add_library(v8_libbase     SHARED IMPORTED GLOBAL)
set_target_properties(v8_libbase PROPERTIES
  IMPORTED_IMPLIB   "${V8_PACKAGE_PATH}/lib/Release/v8_libbase.dll.lib"
  IMPORTED_LOCATION "${V8_REDIST_PACKAGE_PATH}/lib/Release/v8_libbase.dll")

add_library(v8_libplatform SHARED IMPORTED GLOBAL)
set_target_properties(v8_libplatform PROPERTIES
  IMPORTED_IMPLIB   "${V8_PACKAGE_PATH}/lib/Release/v8_libplatform.dll.lib"
  IMPORTED_LOCATION "${V8_REDIST_PACKAGE_PATH}/lib/Release/v8_libplatform.dll")

add_library(v8             SHARED IMPORTED GLOBAL)
set_target_properties(v8 PROPERTIES
  IMPORTED_IMPLIB   "${V8_PACKAGE_PATH}/lib/Release/v8.dll.lib"
  IMPORTED_LOCATION "${V8_REDIST_PACKAGE_PATH}/lib/Release/v8.dll"
  INTERFACE_INCLUDE_DIRECTORIES "${V8_PACKAGE_PATH}/include")
target_link_libraries(v8 INTERFACE v8_libbase v8_libplatform)
target_compile_definitions(v8 INTERFACE
  V8_COMPRESS_POINTERS=1
  V8_31BIT_SMIS_ON_64BIT_ARCH=1
  V8_ENABLE_SANDBOX=1)

set(V8_REDIST_DLLS
  "${V8_REDIST_PACKAGE_PATH}/lib/Release/icudtl.dat"
  "${V8_REDIST_PACKAGE_PATH}/lib/Release/third_party_icu_icui18n.dll"
  "${V8_REDIST_PACKAGE_PATH}/lib/Release/third_party_abseil-cpp_absl.dll"
  "${V8_REDIST_PACKAGE_PATH}/lib/Release/icuuc.dll"
  "${V8_REDIST_PACKAGE_PATH}/lib/Release/v8.dll"
  "${V8_REDIST_PACKAGE_PATH}/lib/Release/v8_libbase.dll"
  "${V8_REDIST_PACKAGE_PATH}/lib/Release/v8_libplatform.dll"
  "${V8_REDIST_PACKAGE_PATH}/lib/Release/third_party_zlib.dll")
