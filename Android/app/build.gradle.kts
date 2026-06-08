// app/build.gradle.kts — DawnTest single-Activity app.
//
// JNI library `libdawntest.so` is built from ../../CMakeLists.txt via
// externalNativeBuild. Gradle invokes CMake once per ABI and packages the
// resulting .so plus everything in src/main/assets (the JS bundle, runtime
// shim, etc.) into the APK.

import org.gradle.api.tasks.Copy

plugins {
    id("com.android.application")
}

android {
    namespace = "com.dawntest"
    compileSdk = 34
    ndkVersion = "28.2.13676358"

    defaultConfig {
        applicationId = "com.dawntest"
        minSdk = 30  // bumped from 28 to enable AImageDecoder (NDK system API)
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"

        ndk {
            // Keep ABIs small for the demo. Add arm64-v8a if you need a real
            // device build; the emulator we ship with is x86_64.
            abiFilters += listOf("x86_64", "arm64-v8a")
        }

        externalNativeBuild {
            cmake {
                arguments += listOf(
                    "-DJS_ENGINE=QuickJS",
                    "-DGRAPHICS_API=OpenGLES",
                    "-DCMAKE_BUILD_TYPE=Release",
                    "-DANDROID_STL=c++_shared",
                    "-DANDROID_PLATFORM=android-30",
                )
                cppFlags += listOf("-std=c++20", "-fexceptions")
                // Only build our app shared lib; skip QuickJS's qjs_exe / qjsc
                // / test262-runner and SPIRV-Tools tools that we don't ship.
                targets += "app"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
        }
        debug {
            isMinifyEnabled = false
            isJniDebuggable = false
        }
    }

    externalNativeBuild {
        cmake {
            // Point at the *root* CMakeLists.txt of the project so we share
            // sources with the Win32 build.
            path = file("../../CMakeLists.txt")
            // 3.22.1 is the SDK-bundled minimum and is what CI installs.
            // Local builds with a newer cmake (3.30+) still work fine because
            // CMakeLists.txt requires >=3.22.
            version = "3.22.1"
        }
    }

    packaging {
        // Avoid duplicate libc++_shared.so from multiple deps.
        jniLibs.useLegacyPackaging = false
        jniLibs.pickFirsts += listOf(
            "**/libc++_shared.so",
        )
        // Belt-and-suspenders: even with EXCLUDE_FROM_ALL in CMake, gradle
        // sometimes spots stray .so files. Drop SPIRV-Tools and the qjs CLI
        // from the APK.
        jniLibs.excludes += listOf(
            "**/libSPIRV-Tools-shared.so",
            "**/libSPIRV-Tools.so",
        )
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// Copy the JS bundle + runtime-shim from the Win32 layout into Android
// assets/ so the same source-of-truth is used. If the source dirs aren't
// present (e.g. on CI where we only build the binary for size measurement)
// the task becomes a no-op so the build still completes.
val syncBundleAssets by tasks.registering(Copy::class) {
    val rootProj = rootDir.parentFile  // ..\
    val assetsDir = File(rootProj, "assets")
    val jsDir = File(rootProj, "js")
    onlyIf { assetsDir.exists() || jsDir.exists() }
    if (assetsDir.exists()) {
        from(assetsDir) {
            include("bundle/scene200*.js")
            include("bundle/scene200-*/**")
            include("bundle/brdf-lut.png")
            include("bundle/*.env")
            include("bundle/*.dds")
            include("brdf-lut.png")
            include("env*.dds")
            include("env*.env")
        }
    }
    if (jsDir.exists()) {
        from(jsDir) {
            into("js")
        }
    }
    into("src/main/assets")
}

tasks.named("preBuild") {
    dependsOn(syncBundleAssets)
}
